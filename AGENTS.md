# AGENTS.md

## What this app is

"Just Idea" — founders post startup ideas, visitors rate them 1–5 and leave
advice, businesses send contact/support requests to the founder.

Stack: React 18 + Vite 6 (frontend), Express 4 (API), Postgres 16 (data).

## Layout

- `src/` — React app; `BrowserRouter` routes `/`, `/share`, `/ideas/:id`
- `src/api.js` — all HTTP calls go to `/api`, proxied by Vite to the API service
- `server/` — Express API (`index.js`), pool + schema (`db.js`), demo seed (`seed.js`)
- `docker-compose.base44.yml` — `web` (host 3000 → 5173), `api` (3001), `db` (5432)

## Sandbox / preview specifics

- Bring up with `docker compose -f docker-compose.base44.yml up -d`; `web` waits
  for `api` healthy, `api` waits for `db` healthy.
- Both lock files are committed (`package-lock.json`, `server/package-lock.json`)
  because each container runs `npm ci` on start. There is no Node on the sandbox
  host, so regenerate them with a throwaway `node:22-bookworm-slim` container.
- Tables are created by `server/db.js` at API boot — no migration service. There is
  no user/auth system: everything is anonymous, identified only by a typed name.
- `/api` is never published on a host port; Vite proxies it (`API_URL`). Keep it
  that way — the API has no CORS middleware by design (single origin).
- The preview proxy reaches Vite as `<port>-<sandbox id>.$BASE44_SANDBOX_HOST_DOMAIN`
  and sends an `Origin` of `https://3000-$BASE44_PUBLIC_HOST_SUFFIX`. `vite.config.js`
  appends both as `.`-prefixed `allowedHosts` entries only when
  `BASE44_PREVIEW_MODE === "1"`; without the flag the list stays empty.
- File watching uses polling (`server.watch.usePolling`); the API runs `node --watch`.

## Verifying it works

- `curl http://localhost:3000/api/ideas` returns the feed JSON (proves web → api → db).
- The served HTML must include `/@vite/client` and unhashed `/src/main.jsx` — that
  proves the dev server, not a prebuilt bundle, is serving the cloned source.
- Browser flow: post an idea → rate it → leave advice → send support. Each should
  appear on the detail page and change the four stat cards.
- Counts come from the same `GET /api/ideas/:id` response as the lists. After a
  submit the page re-fetches, so read stats only after the list item appears; a
  read taken in the same tick can still show the previous values.

## Gotchas

- `docker compose exec -T api npm run seed` only inserts when `ideas` is empty.
- Deleting an idea cascades to its ratings, advice and interests.
- No test suite or linter is configured.
- Postgres credentials are development-only values inline in compose; swap them
  before any real deployment.
