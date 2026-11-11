# Just Idea

A place where founders post a startup idea, everyone else rates it and leaves
advice, and businesses contact the founder or offer support.

## Run it here (sandbox / preview)

```sh
docker compose -f docker-compose.base44.yml up -d --build
```

Three services:

| service | what it is | port |
| --- | --- | --- |
| `web` | React + Vite frontend (bind-mounted, hot reload) | host `3000` → `5173` |
| `api` | Express API, `/api/*` | internal `3001` |
| `db` | Postgres 16, data in the `db_data` volume | internal `5432` |

The browser only ever talks to port `3000`: Vite proxies `/api` to the API
service (`API_URL` in compose), so there is one origin and no CORS setup.

### Example ideas

The feed starts with three example ideas so the page is not empty. To add them
once (they are skipped if any idea already exists):

```sh
docker compose -f docker-compose.base44.yml exec -T api npm run seed
```

### Dependencies

Both `package-lock.json` and `server/package-lock.json` are committed; each
service runs `npm ci` on startup, then its dev command (`vite` / `node --watch`).
Dependencies live in the `web_node_modules` and `api_node_modules` volumes. To
refresh a lock file after changing dependencies:

```sh
docker run --rm -v "$PWD":/app -w /app node:22-bookworm-slim \
  npm install --package-lock-only --no-audit --no-fund
```

Run the same command with `-v "$PWD/server":/app` for the API.

## Data model

- `ideas` — title, pitch, description, category, founder name/email
- `ratings` — 1–5 score per person per idea
- `advice` — written notes left on an idea
- `interests` — business contact/support requests (`kind`: `contact` | `support`)

The API creates the tables on boot (`server/db.js`), so there is no separate
migration step. All child rows cascade when an idea is deleted.

## API

| method | path | purpose |
| --- | --- | --- |
| GET | `/api/ideas` | feed with averages and counts |
| POST | `/api/ideas` | post an idea |
| GET | `/api/ideas/:id` | idea with advice, interests, ratings |
| POST | `/api/ideas/:id/ratings` | rate 1–5 |
| POST | `/api/ideas/:id/advice` | leave advice |
| POST | `/api/ideas/:id/interests` | business contact or support |

## Frontend

- `src/pages/FeedPage.jsx` — idea feed
- `src/pages/IdeaPage.jsx` — detail, rating, advice, business panel
- `src/pages/SharePage.jsx` — post an idea
- `src/api.js` — fetch wrapper

## Preview mode

`vite.config.js` only touches the host allowlist when
`BASE44_PREVIEW_MODE === "1"`, appending `.${BASE44_PUBLIC_HOST_SUFFIX}` and
`.${BASE44_SANDBOX_HOST_DOMAIN}` to `server.allowedHosts` so the proxied preview
host and HMR are accepted. With the flag unset the list stays empty and Vite
behaves normally. No host is hardcoded.
