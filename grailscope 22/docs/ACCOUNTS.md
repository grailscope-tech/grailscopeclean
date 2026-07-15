# Comptes utilisateurs & watchlist persistée

GrailScope passe du prototype au produit : chaque utilisateur crée un compte et
sa watchlist est **sauvegardée côté serveur**, synchronisée sur web et mobile.

## Architecture

```
Web / Mobile ──GrailScopeApi(core)──▶  API Express
                                         ├─ auth.ts   scrypt (hash mdp) + JWT HS256
                                         └─ db.ts     node:sqlite (users, watchlist)
```

Aucune dépendance externe : tout repose sur les modules intégrés de Node
(`node:sqlite`, `node:crypto`). Pas de service tiers à provisionner pour démarrer.

## Endpoints

| Méthode | Route | Auth | Rôle |
|--------|-------|------|------|
| POST | `/api/auth/register` | — | Créer un compte → `{ token, user }` |
| POST | `/api/auth/login` | — | Se connecter → `{ token, user }` |
| GET | `/api/me` | Bearer | Utilisateur courant |
| GET | `/api/watchlist` | Bearer | Liste des `assetId` suivis |
| PUT | `/api/watchlist/:assetId` | Bearer | Ajouter |
| DELETE | `/api/watchlist/:assetId` | Bearer | Retirer |

Le token JWT est envoyé en `Authorization: Bearer <token>`.

## Sécurité

- Mots de passe hachés via **scrypt** + sel aléatoire (jamais stockés en clair).
- Sessions sans état via **JWT HS256** signé avec `JWT_SECRET` (expiration 30 j).
- Comparaison à temps constant pour la vérification du mot de passe.
- En production : définir `JWT_SECRET` (sinon un secret de dev non sûr est utilisé,
  avec avertissement au démarrage) et servir l'API en HTTPS.

## Côté apps

- **Web** : `AuthProvider` (`apps/web/src/auth.tsx`) garde le token dans
  `localStorage`, restaure la session au chargement, et synchronise la watchlist.
  Modal connexion/inscription dans le header. Hors-ligne / non connecté : la
  watchlist reste locale.
- **Mobile** : `StoreProvider` (`apps/mobile/src/store.tsx`) + écran `Login`
  accessible depuis l'onglet Watchlist. (Le token est en mémoire de session ;
  pour la prod, le persister via `expo-secure-store`.)

## Alertes de prix & notifications

Chaque utilisateur peut poser des alertes sur un objet :

| Type | Déclenchement |
|------|---------------|
| `signal` | le signal Acheter/Vendre **change** (front montant) |
| `above`  | la cote **dépasse** un seuil |
| `below`  | la cote **repasse sous** un seuil |

Le serveur réévalue toutes les alertes périodiquement (`ALERT_INTERVAL_MS`, défaut
5 min) et au rafraîchissement du feed live. Quand une condition est remplie, une
**notification** in-app est créée puis diffusée par un `CompositeNotifier` sur
plusieurs canaux (best-effort, une panne de canal n'en bloque pas les autres) :

- **Console** (toujours) — journalisation.
- **E-mail** (`EmailNotifier`) — activé dès que `SMTP_URL` (ou `SMTP_HOST`) est
  défini ; utilise nodemailer. Expéditeur via `MAIL_FROM`.
- **Push mobile** (`ExpoPushNotifier`) — envoie via l'API Expo Push aux appareils
  enregistrés (token `ExponentPushToken[...]`).

Les alertes de seuil sont *edge-triggered* : pas de spam tant que la condition ne
se réarme pas.

Endpoints : `GET/PUT/DELETE /api/alerts`, `GET /api/notifications`,
`POST /api/notifications/read`, `POST /api/push/register`. Côté apps :
- **Web** : bouton « 🔔 M'alerter » + seuils ≥/≤ sur la fiche, cloche + compteur
  non-lus, et un tableau de bord **« Mes alertes »** (lister / supprimer).
- **Mobile** : toggle d'alerte sur la fiche, enregistrement automatique du token
  push à la connexion, liste « Mes alertes » (supprimer) + alertes récentes.

Variables e-mail : `SMTP_URL` *ou* (`SMTP_HOST`,`SMTP_PORT`,`SMTP_USER`,`SMTP_PASS`,
`SMTP_SECURE`), `MAIL_FROM`. Push : aucune config serveur (clé Expo gérée côté app).

## Portefeuille (positions + plus-value)

Chaque utilisateur déclare les pièces qu'il possède (quantité + prix d'achat
unitaire). GrailScope valorise le tout à la cote courante et calcule la
plus/moins-value par position et au total.

- `computePortfolio(holdings, assets)` (`packages/core/src/portfolio.ts`) — fonction
  pure partagée serveur + apps : valeur, coût, P&L, P&L %.
- Endpoints : `GET /api/portfolio`, `GET /api/portfolio/summary`,
  `PUT /api/portfolio` (`{ assetId, quantity, unitCost }`), `DELETE /api/portfolio/:assetId`.
- Stockage : table `holdings` (SQLite et Postgres).
- Apps : « J'en possède » (quantité + prix payé) sur la fiche ; tableau de bord
  **Portefeuille** (web : valeur, investi, P&L, positions) ; résumé sur l'onglet
  Watchlist (mobile).

## Persistance : SQLite ⇄ Postgres

La persistance vit derrière une **interface `Store` unique** (`server/src/store.ts`)
avec deux implémentations interchangeables :

- **SQLite** (`node:sqlite`) — défaut, écrit dans `DB_PATH` (`./grailscope.db`).
  Parfait en dev ou sur un hôte avec disque persistant.
- **PostgreSQL** (`pg`) — activé dès que `DATABASE_URL` est défini. Recommandé en
  prod (durable, concurrent). Le schéma est créé automatiquement au démarrage.

Basculer de l'un à l'autre = une variable d'environnement ; **aucun handler d'API
ne change**. Sur un hébergeur éphémère sans disque (Render free en Docker),
utiliser Postgres (ou attacher un disque et pointer `DB_PATH` dessus).

## Lancer en local

```bash
JWT_SECRET=$(openssl rand -hex 32) LIVE_CARDS=1 npm run dev:server
# puis le web avec VITE_DATA_SOURCE=http et VITE_API_URL=http://localhost:4000
```
