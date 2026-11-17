# AGENTS.md

## What this app is

"Just Idea" — founders post startup ideas, visitors rate them 1–5 and leave
advice, businesses send contact/support requests to the founder.

Stack: React 18 + Vite 6 (frontend), Express 4 (API), Postgres 16 (data).

## Layout

- `src/` — React app; `BrowserRouter` routes `/` (public opening page with the
  top "Sign in" button), `/ideas` (the app feed), `/share`, `/ideas/:id`,
  `/login`, `/terms`. Signing in lands on `/ideas`.
- `src/api.js` — all HTTP calls go to `/api`, proxied by Vite to the API service
- `src/auth.jsx` — `AuthProvider` / `useAuth`; session state comes from `/api/auth/me`
- `server/` — Express API (`index.js`), pool + schema (`db.js`), auth (`auth.js`,
  `auth-routes.js`), LinkedIn OAuth (`linkedin.js`), middleware (`security.js`),
  routes (`ideas.js`), demo seed (`seed.js`, `demo.js`)
- `docker-compose.base44.yml` — `web` (host 3000 → 5173), `api` (3001), `db` (5432)

## Branches

- `main` carries only `README.md` (commit `052922a`), so anything built from `main`
  has no app to serve and fails to start. The application code lives on
  `base44/setup-910ae5cc`; a branch that should run must include that commit
  (e.g. `git merge origin/base44/setup-910ae5cc` from the initial commit).
  `fix-main-306521de1464` already contains it plus the auth/security work.

## Sandbox / preview specifics

- Bring up with `docker compose -f docker-compose.base44.yml up -d`; `web` waits
  for `api` healthy, `api` waits for `db` healthy.
- Both lock files are committed (`package-lock.json`, `server/package-lock.json`)
  because each container runs `npm ci` on start. There is no Node on the sandbox
  host, so regenerate them with a throwaway `node:22-bookworm-slim` container.
- Tables are created by `server/db.js` at API boot — no migration service.
- Auth: email + password (scrypt) sessions in HttpOnly `ji_session` cookies, plus a
  double-submit `ji_csrf` cookie; every non-GET `/api` call needs a JSON body and the
  `X-CSRF-Token` header (the client fetches `/api/auth/csrf` automatically). New
  ideas and sign-ups also carry the signed arithmetic challenge from `/api/challenge`.
- `SESSION_SECRET` signs sessions, challenge tokens and encrypted LinkedIn tokens.
  It arrives from the platform through `env_file: /run/base44/app.env` on the `api`
  service — never inline it under compose `environment:`, which would outrank that
  file. Without it the API still boots on an ephemeral key, so every restart logs
  everyone out and invalidates challenges.
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` are optional. Without them the API
  reports `linkedin.configured: false` and the owner-only LinkedIn card explains
  that publishing is unavailable instead of linking to a failing OAuth start.
- Demo account for evaluating gated flows: `demo@justidea.dev` / `demo-pass-2026`
  (seeded at API boot, owns the three example ideas).
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
- Every feed card carries four actions (`src/components/IdeaActions.jsx`): Like is a
  signed-in toggle (`POST /api/ideas/:id/like`, rows in `idea_likes`, feed returns
  `like_count` + `liked_by_me`); Comment, Contact and Suggest deep-link to
  `/ideas/:id#comment`, `#contact` and `#suggest`, which `IdeaPage` scrolls to
  (the suggestion anchor also focuses the advice textarea).
- Signed-in flow: "Use the demo account" on `/login`, then open one of the demo
  ideas — the owner-only startup-help and LinkedIn cards appear on `/ideas/:id`.
- Counts come from the same `GET /api/ideas/:id` response as the lists. After a
  submit the page re-fetches, so read stats only after the list item appears; a
  read taken in the same tick can still show the previous values.

## Gotchas

- `docker compose exec -T api npm run seed` only inserts when `ideas` is empty.
- Deleting an idea cascades to its ratings, advice and interests.
- No test suite or linter is configured.
- Postgres credentials are development-only values inline in compose; swap them
  before any real deployment.
