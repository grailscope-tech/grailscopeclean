import { computeSignal, signalLabel, formatPrice, type Asset } from "@grailscope/core";
import type { Store } from "./store.js";

/** Where a fired alert can be delivered for one user. */
export interface NotifyTarget {
  email: string | null;
  pushTokens: string[];
}

export interface Notifier {
  send(target: NotifyTarget, subject: string, body: string): Promise<void>;
}

/** Always-on: logs to stdout (and is the fallback when nothing else is set up). */
export class ConsoleNotifier implements Notifier {
  async send(target: NotifyTarget, subject: string, body: string) {
    console.log(`🔔 [alert] → ${target.email ?? "user"} (${target.pushTokens.length} device(s)): ${subject} — ${body}`);
  }
}

/** Real e-mail via an injected transport (nodemailer-compatible). */
export class EmailNotifier implements Notifier {
  constructor(private transport: { sendMail: (m: any) => Promise<unknown> }, private from = process.env.MAIL_FROM || "alerts@grailscope.app") {}
  async send(target: NotifyTarget, subject: string, body: string) {
    if (!target.email) return;
    await this.transport.sendMail({ from: this.from, to: target.email, subject, text: body });
  }
}

/** Mobile push via the Expo Push API (https://exp.host/--/api/v2/push/send). */
export class ExpoPushNotifier implements Notifier {
  constructor(private fetchImpl: typeof fetch = fetch) {}
  async send(target: NotifyTarget, subject: string, body: string) {
    const tokens = target.pushTokens.filter((t) => t.startsWith("ExponentPushToken"));
    if (!tokens.length) return;
    const messages = tokens.map((to) => ({ to, title: subject, body, sound: "default" }));
    await this.fetchImpl("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
  }
}

/** Fan-out to several channels; one channel failing never blocks the others. */
export class CompositeNotifier implements Notifier {
  constructor(private notifiers: Notifier[]) {}
  async send(target: NotifyTarget, subject: string, body: string) {
    await Promise.allSettled(this.notifiers.map((n) => n.send(target, subject, body)));
  }
}

/**
 * Build the active notifier from the environment:
 *   - ConsoleNotifier   always
 *   - EmailNotifier     when SMTP_URL (or SMTP_HOST) is set (uses nodemailer)
 *   - ExpoPushNotifier  always (no-ops when a user has no device tokens)
 */
export async function createNotifier(): Promise<Notifier> {
  const notifiers: Notifier[] = [new ConsoleNotifier(), new ExpoPushNotifier()];
  if (process.env.SMTP_URL || process.env.SMTP_HOST) {
    try {
      const nodemailer = await import("nodemailer");
      const transport = process.env.SMTP_URL
        ? nodemailer.createTransport(process.env.SMTP_URL)
        : nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT ?? 587),
            secure: process.env.SMTP_SECURE === "1",
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
          });
      notifiers.push(new EmailNotifier(transport));
      console.log("Notifier: e-mail enabled (SMTP).");
    } catch (e) {
      console.warn("Notifier: SMTP configured but nodemailer unavailable —", (e as Error).message);
    }
  }
  return new CompositeNotifier(notifiers);
}

/**
 * Evaluate every alert against the current catalogue and deliver notifications.
 *   - "signal": fires when the buy/sell signal flips to BUY or SELL
 *   - "above" / "below": edge-triggered threshold crossings
 * Returns the number of notifications created.
 */
export async function checkAlerts(store: Store, assets: Asset[], notifier?: Notifier): Promise<number> {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const targetCache = new Map<string, NotifyTarget>();
  const alerts = await store.allAlerts();
  let fired = 0;

  for (const alert of alerts) {
    const asset = byId.get(alert.asset_id);
    if (!asset) continue;

    let message: string | null = null;
    let newState = alert.last_state;

    if (alert.kind === "signal") {
      const sig = computeSignal(asset).signal;
      if (sig !== alert.last_state && (sig === "BUY" || sig === "SELL"))
        message = `${asset.name} : signal ${signalLabel[sig]} (${formatPrice(asset.price, asset.currency)}).`;
      newState = sig;
    } else if (alert.kind === "above" && alert.threshold != null) {
      const over = asset.price >= alert.threshold;
      if (over && alert.last_state !== "fired") {
        message = `${asset.name} a dépassé ${formatPrice(alert.threshold, asset.currency)} (cote ${formatPrice(asset.price, asset.currency)}).`;
        newState = "fired";
      } else if (!over) newState = null;
    } else if (alert.kind === "below" && alert.threshold != null) {
      const under = asset.price <= alert.threshold;
      if (under && alert.last_state !== "fired") {
        message = `${asset.name} est repassé sous ${formatPrice(alert.threshold, asset.currency)} (cote ${formatPrice(asset.price, asset.currency)}).`;
        newState = "fired";
      } else if (!under) newState = null;
    }

    if (newState !== alert.last_state) await store.setAlertState(alert.id, newState ?? "");
    if (message) {
      await store.addNotification(alert.user_id, alert.asset_id, message);
      if (notifier) {
        let target = targetCache.get(alert.user_id);
        if (!target) {
          target = { email: await store.getUserEmail(alert.user_id), pushTokens: await store.getPushTokens(alert.user_id) };
          targetCache.set(alert.user_id, target);
        }
        await notifier.send(target, "GrailScope — alerte", message);
      }
      fired++;
    }
  }
  return fired;
}
