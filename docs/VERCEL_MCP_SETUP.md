# Vercel MCP Setup

## Purpose

This file tells Codex how to use Vercel MCP for the OrganizeMyMusic MVP.

Vercel is used for the Next.js web app. It should not be assumed to host the persistent `pg-boss` worker.

## Scope

Codex may use Vercel MCP to:

- Inspect whether a Vercel project already exists.
- Create a Vercel project if none exists.
- Configure environment variables.
- Create preview deployments.
- Inspect build logs.
- Promote to production only when checks pass and the user intends production deployment.

Codex must not use Vercel MCP to:

- Delete projects.
- Overwrite production env vars without reporting exact changes.
- Deploy production with failing typecheck/tests/build.
- Put server secrets in public `NEXT_PUBLIC_` variables.
- Assume background worker jobs run inside Vercel serverless.

## Vercel project

Recommended project settings:

```text
Framework: Next.js
Build command: npm run build
Install command: npm install
Output: default Next.js output
```

## Required Vercel environment variables

Public browser variables:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Server-only variables:

```text
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
APPLE_TEAM_ID
APPLE_KEY_ID
APPLE_PRIVATE_KEY
APPLE_MUSICKIT_KEY
OPENAI_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_SORT
SENTRY_DSN
ENCRYPTION_KEY
```

Stripe variables can remain empty until payment is added.

## Confirmed Supabase values

Use these values when configuring Vercel for the existing Supabase project:

```text
NEXT_PUBLIC_SUPABASE_URL=https://lxkinmyfcarpnynapewt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<confirmed browser-safe anon or publishable key from Supabase>
SUPABASE_SERVICE_ROLE_KEY=<server-only Supabase service role key>
DATABASE_URL=<server-only Supabase Postgres connection string>
```

Do not put `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` in `NEXT_PUBLIC_*` variables.

## Environment variable rules

- `NEXT_PUBLIC_*` variables are visible to browser code.
- Never put Apple private key in `NEXT_PUBLIC_*`.
- Never put service role key in `NEXT_PUBLIC_*`.
- Never put encryption key in `NEXT_PUBLIC_*`.
- Never put OpenAI API key in `NEXT_PUBLIC_*`.

## Deployment sequence

1. Run local checks if possible.
2. Confirm Supabase env vars exist.
3. Confirm Apple env vars exist if Apple routes are enabled.
4. Configure Vercel project env vars.
5. Deploy preview.
6. Inspect build logs.
7. Smoke test preview URL.
8. Only then consider production deployment.

## Worker warning

The `pg-boss` worker should run as a separate process.

Do not rely on Vercel serverless functions for persistent job processing. Vercel can host the web app and API routes, but background jobs need a worker host such as:

- Railway
- Render
- Fly.io
- A VPS
- Another persistent Node runtime

The final hosting choice should be documented in `docs/DEPLOYMENT_OPERATIONS.md`.

## Vercel MCP completion report

After Vercel MCP changes, Codex should report:

```text
Vercel project:
Deployment URL:
Environment variables added:
Environment variables changed:
Build status:
Errors:
Production affected: yes/no
```

## Current setup status

`MVP-024` completed on 2026-05-22.

Observed local state:

- Vercel MCP can list teams, projects, and deployments.
- Vercel MCP does not currently expose environment-variable mutation tools in
  this session, so the Vercel CLI was used for env changes.
- The `vercel` CLI is not installed on the local PATH.
- `npx --yes vercel --version` can fetch Vercel CLI 54.4.1 when network access
  is allowed.
- Vercel device authentication succeeded for account `kulibabkaaa`; a later
  re-authentication retry also succeeded through MCP and `npx --yes vercel
  whoami`.
- Existing Vercel project found: `kulibabkaaas-projects/organize-my-music`
  (`prj_78lnTMHyyYcqppVMFfwPBu31vimn`).
- Local Vercel link metadata exists in `.vercel/repo.json`; `.vercel` is
  gitignored.
- Existing Production deployment before MVP-024 completion:
  - ID: `dpl_B4MyqtXZjRT4cXEPBy6DbMyFnLYw`
  - URL: `organize-my-music-7ngp98irc-kulibabkaaas-projects.vercel.app`
  - Target: Production
  - State: `READY`
  - Source: older `main` branch commit.
- Preview deployment:
  - ID: `dpl_376SpY9WvEQdwpFCZ6rCJTf6oPyB`
  - URL: `organize-my-music-oap93gdsl-kulibabkaaas-projects.vercel.app`
  - State: `READY`
  - Source: Vercel CLI local deployment from dirty `codex/Mvp` worktree.
- `NEXT_PUBLIC_APP_URL` was added to Production, Preview, and Development.
- `NEXT_PUBLIC_SUPABASE_URL` was added to Production, Preview, and
  Development.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` was added to Production, Preview, and
  Development using the Supabase publishable key.
- `ENCRYPTION_KEY` already existed in Production, Preview, and Development.
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`,
  `APPLE_PRIVATE_KEY`, `APPLE_MUSICKIT_KEY`, `OPENAI_API_KEY`, and
  `SENTRY_DSN` were added to Production and Preview.
- Stripe variables were intentionally skipped until payment is activated.
- Landing page and signed-out dashboard smoke checks returned `200`.
- `/api/apple/developer-token` returned `401` while signed out, which matches
  the authenticated route guard.

Safe next step: configure the persistent worker host. Do not claim worker
deployment is complete from the Vercel web preview alone.
