# Mettre GrailScope en ligne

Le stack se déploie en deux morceaux : l'**API** (Express + connecteurs live) et
le **web** (build statique Vite). Le mobile se publie séparément via Expo EAS.

## Option 1 — Render (le plus simple, 1 blueprint)

Le fichier [`render.yaml`](../render.yaml) déclare les **deux** services.

1. Pousser ce repo sur GitHub.
2. Render → **New → Blueprint** → sélectionner le repo. Render lit `render.yaml`
   et crée `grailscope-api` (Docker) + `grailscope-web` (statique).
3. Le blueprint provisionne aussi une **base Postgres managée** (`grailscope-db`)
   et l'injecte dans l'API via `DATABASE_URL` → comptes, watchlists et alertes
   durables. `JWT_SECRET` est auto-généré. L'API démarre avec `LIVE_CARDS=1` →
   elle agrège **Scryfall + Pokémon TCG** au démarrage puis toutes les heures.
   Vérifier `https://grailscope-api.onrender.com/health`.
4. Renseigner la variable `VITE_API_URL` du service web avec l'URL de l'API
   (ex. `https://grailscope-api.onrender.com`), puis redéployer le web.

C'est tout — le site est en ligne et auto-alimenté.

## Option 2 — Vercel (web) + Fly.io (API)

**API sur Fly** (Docker, voir [`fly.toml`](../fly.toml)) :

```bash
fly launch --no-deploy   # réutilise fly.toml
fly deploy               # LIVE_CARDS=1 déjà dans [env]
```

**Web sur Vercel** ([`apps/web/vercel.json`](../apps/web/vercel.json)) :

```bash
cd apps/web && vercel --prod
# définir les variables d'environnement Vercel :
#   VITE_DATA_SOURCE = http
#   VITE_API_URL     = https://grailscope-api.fly.dev
```

## Option 3 — Docker (n'importe quel hébergeur)

```bash
docker build -t grailscope-api .
docker run -p 4000:4000 -e LIVE_CARDS=1 grailscope-api
# API sur http://localhost:4000  (/health, /api/assets, /api/signals…)
```

Servir le web statique après `npm run build:web` (dossier `apps/web/dist`) sur
n'importe quel CDN/host (Netlify, Cloudflare Pages, S3…).

## Mobile (Expo EAS)

```bash
cd apps/mobile
npx eas build --platform all     # binaires iOS/Android
npx eas submit                   # soumission aux stores
```

Pour pointer le mobile sur l'API en prod, passer la source HTTP dans
`apps/mobile/src/store.tsx` (`createDataSource({ mode: "http", apiUrl })`).

## Variables d'environnement

| Service | Variable | Valeur |
|---------|----------|--------|
| API | `PORT` | `4000` (ou fourni par l'hôte) |
| API | `LIVE_CARDS` | `1` pour activer le feed live |
| API | `POKEMONTCG_API_KEY` | *(optionnel)* relève les limites de débit |
| API | `JWT_SECRET` | secret de signature des sessions (obligatoire en prod) |
| API | `DB_PATH` | chemin SQLite (ex. `/data/grailscope.db` sur disque persistant) |
| API | `DATABASE_URL` | si défini → bascule sur PostgreSQL (durable) |
| API | `SMTP_URL` | active l'envoi d'alertes par e-mail (nodemailer) |
| API | `MAIL_FROM` | adresse expéditeur des alertes |
| API | `ALERT_INTERVAL_MS` | fréquence d'évaluation des alertes (défaut 5 min) |
| Web | `VITE_DATA_SOURCE` | `http` |
| Web | `VITE_API_URL` | URL publique de l'API |

## CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) typecheck le core,
**exécute la preuve du pipeline live** (sur payloads enregistrés, sans réseau)
puis build le web — à chaque push.
