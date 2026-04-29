# AGENTS.md — movie-site

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (port 3000, root=`public/`) |
| `npm run server` | Express backend only (port 3001) |
| `npm start` | Express backend (production entry) |
| `npm run build` | Vite build `public/` → `dist/` |
| `pm2:start` / `pm2:stop` / `pm2:restart` | PM2 cluster (2 instances) |

No tests, lint, typecheck, CI, or codegen exist. Do not attempt to run them.

## Dev workflow

Run both concurrently (two terminals):
1. `npm run dev` — Vite on `:3000`, proxies `/api` → `localhost:3001`
2. `npm run server` — Express API server on `:3001`

The Vite proxy in `vite.config.js` forwards `/api/*` to the backend. The backend needs no proxy for itself — it listens independently.

## Architecture

- **Frontend:** vanilla HTML/CSS/JS in `public/`. Vite root = `public/`. Built into `dist/`.
- **Backend:** Express proxy in `src/server.js`. All API endpoints wrap `https://api.yzzy-api.com/inc/apijson.php` with `raw_content` JSON extraction.
- **Video playback:** HLS.js imported via `import Hls from 'hls.js'` — bundled by Vite.
- **Navigation:** customized via `public/config.js` (navConfig for parent/child categories, hidden types, display names).
- **Env:** `.env` controls `PORT`, `NODE_ENV`, `ALLOWED_ORIGINS`, `API_BASE_URL`.
- **Caching:** in-memory Map in `src/server.js`, 1-hour TTL, max 1000 entries. Frontend preloads next page in background.

## Production

- `pm2 start ecosystem.config.js` — cluster mode, 2 instances, `NODE_ENV=production`, `PORT=3001`
- Backend serves `dist/` static files (built frontend).
- See `nginx.conf.example` for reverse proxy config.
- `debian10-deploy.sh` — one-click deploy script for Debian 10.

## API endpoints (all in `src/server.js`)

- `GET /api/detail?ac=&t=&pg=&ids=&wd=` — video list/detail/search
- `GET /api/types` — all video categories
- `GET /api/search?wd=` — search videos
- `GET /api/class?t=` — classified list
- `GET /api/proxy-video?url=` — proxy HLS m3u8 (adds referer header)
- `GET /api/proxy-ts?url=` — proxy TS segments
