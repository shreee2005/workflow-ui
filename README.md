Workflow UI (minimal starter)
----------------------------
This folder contains a minimal React + Vite app and a Dockerfile used by docker-compose.

Commands:
  # create lockfile and node_modules locally (required so Docker can run `npm ci`)
  cd C:\dev\workflow-ui
  npm install

  # then from C:\dev\dev-infra
  docker compose up -d --build

Notes:
- postcss.config.cjs is intentionally minimal to avoid PostCSS parse errors.
- If you add real PostCSS/Tailwind, ensure postcss.config.cjs is valid JS and any required plugins are in package.json.
