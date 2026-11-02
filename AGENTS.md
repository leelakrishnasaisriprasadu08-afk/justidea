# AGENTS.md

## What this app is

React 18 + Vite 6 single-page app (`justidea`). No backend, no database — ideas
persist in the browser's `localStorage` under the key `justidea.ideas`.

## Sandbox / preview specifics

- Run with `docker compose -f docker-compose.base44.yml up -d`. Host port 3000 →
  Vite 5173. The container installs from `package-lock.json` (`npm ci`) on every
  start, then runs `npm run dev`.
- `package-lock.json` must exist and be committed; there is no Node runtime on
  the sandbox host, so regenerate it with:
  `docker run --rm -v "$PWD":/app -w /app node:22-bookworm-slim npm install --package-lock-only --no-audit --no-fund`
- Dependencies live in the `web_node_modules` named volume (not on the host), so
  `node_modules` never appears in the working tree.
- The preview proxy reaches Vite as `<port>-<sandbox id>.$BASE44_SANDBOX_HOST_DOMAIN`
  and sends an `Origin` of `https://3000-$BASE44_PUBLIC_HOST_SUFFIX`. `vite.config.js`
  appends both as `.`-prefixed `server.allowedHosts` entries only when
  `BASE44_PREVIEW_MODE === "1"`; compose passes those variables through. Without the
  flag, `allowedHosts` stays empty (Vite's default behavior).
- File watching uses polling (`server.watch.usePolling`), required for bind mounts.

## Verifying it works

- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → `200`.
- The served HTML must include `/@vite/client` and unhashed `/src/main.jsx` — that
  proves the dev server (not a production build) is serving the cloned source.
- In the browser: add an idea, confirm it appears in the list and in
  `localStorage['justidea.ideas']`, then reload and confirm it is still there.

## Gotchas

- There is no test suite or linter configured yet.
- `crypto.randomUUID()` is used for ids; it needs a secure context, which the
  preview provides. On plain `http://` hosts other than localhost it is unavailable.
