import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";

/**
 * Auth primitives with ZERO external dependencies (Node built-ins only):
 *  - password hashing via scrypt (salted)
 *  - stateless sessions via a minimal HMAC-SHA256 JWT
 */

const SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
if (!process.env.JWT_SECRET) {
  console.warn("⚠  JWT_SECRET not set — using an insecure dev secret. Set it in production.");
}

// ---------- password hashing ----------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  return candidate.length === original.length && timingSafeEqual(candidate, original);
}

// ---------- minimal JWT (HS256) ----------
const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function sign(data: string): string {
  return b64url(createHmac("sha256", SECRET).update(data).digest());
}

export function signToken(payload: Record<string, unknown>, ttlSeconds = 60 * 60 * 24 * 30): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(
    JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSeconds }),
  );
  return `${header}.${body}.${sign(`${header}.${body}`)}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  if (sign(`${header}.${body}`) !== sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
