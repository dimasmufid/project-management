# Project Management

## Local development

`npm run dev` now starts the Vite app against the Convex production deployment
using the Convex CLI:

```bash
npm run dev
```

This runs `convex deploy` first, then starts `vite` with
`VITE_CONVEX_URL` injected from the production deployment.

If you want the old local/dev-deployment workflow, use:

```bash
npm run convex:dev
npm run dev:local
```

The local auth deployment also needs `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS`.
Those are now configured for the current dev deployment.

## Production deploy

Deploy Convex first and build the Vite app against the production Convex URLs:

```bash
npm run deploy:prod
```

That runs `npx convex deploy --cmd 'npm run build:web'`, and Convex injects both
`VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` into the build command.

## Current environment setup

Convex dev:

- `SITE_URL=http://localhost:5173`
- `JWT_PRIVATE_KEY` set
- `JWKS` set

Convex prod:

- `SITE_URL=https://project-management-one-sigma.vercel.app`
- `JWT_PRIVATE_KEY` set
- `JWKS` set

Vercel production:

- `VITE_CONVEX_URL=https://trustworthy-dalmatian-54.convex.cloud`
- `VITE_CONVEX_SITE_URL=https://trustworthy-dalmatian-54.convex.site`

## Vercel note

If you want Vercel builds to push Convex automatically instead of deploying
Convex from your machine, add `CONVEX_DEPLOY_KEY` in Vercel from the Convex
dashboard and use `npm run deploy:prod` as the Vercel build command.

## GitHub to Vercel CI/CD

This repo now includes GitHub Actions for Vercel:

- `.github/workflows/vercel-preview.yml` deploys preview builds for pull requests.
- `.github/workflows/vercel-production.yml` deploys production on pushes to `main`.
- `vercel.json` locks the Vercel build to `bun run build`, publishes `dist`, and rewrites SPA routes to `index.html`.

GitHub still needs one repository secret:

- `VERCEL_TOKEN`

The workflow already contains the current Vercel org and project IDs from the
linked project, so no extra GitHub variables are required.

Vercel also needs both `VITE_CONVEX_URL` and `VITE_CONVEX_SITE_URL` defined for
both `Production` and `Preview` environments. Production was already present; if
you keep preview deployments on the same Convex backend for now, mirror those
same values into `Preview`.
