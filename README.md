# Just Idea

A small React + Vite starter app for capturing ideas. Ideas are kept in the
browser's `localStorage`, so there is no backend or database to run.

## Run it here (sandbox / preview)

```sh
docker compose -f docker-compose.base44.yml up -d --build
```

- The Vite dev server runs from the bind-mounted source, so edits hot-reload.
- Host port `3000` maps to Vite's `5173`.
- `package-lock.json` is required: the container runs `npm ci` on startup, then
  `npm run dev`. If you change dependencies, regenerate the lock file (below).

Dependencies live in the `web_node_modules` named volume — do not delete app
data to refresh them; the startup command reinstalls from the lock file.

## Run it locally without Docker

```sh
npm ci
npm run dev
```

## Regenerating the lock file (no host Node required)

```sh
docker run --rm -v "$PWD":/app -w /app node:22-bookworm-slim \
  npm install --package-lock-only --no-audit --no-fund
```

## Preview-mode configuration

`vite.config.js` only touches the host allowlist when
`BASE44_PREVIEW_MODE === "1"`, appending `.${BASE44_PUBLIC_HOST_SUFFIX}` and
`.${BASE44_SANDBOX_HOST_DOMAIN}` to `server.allowedHosts` so the proxied
preview host and HMR are accepted. With the flag unset the list stays empty and
Vite behaves normally. The compose service passes those variables through
(fewer than the `BASE44_PREVIEW_MODE` gate, no hardcoded hosts).

## Structure

- `src/App.jsx` — page shell
- `src/IdeaForm.jsx` — add-idea form
- `src/IdeaList.jsx` — idea list with complete/delete
- `src/useIdeas.js` — state + `localStorage` persistence
