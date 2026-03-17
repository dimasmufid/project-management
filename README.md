# Project Management

## Local development

Run Convex and let it keep `.env.local` in sync:

```bash
npx convex dev
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
