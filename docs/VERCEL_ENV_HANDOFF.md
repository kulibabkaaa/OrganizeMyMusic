# Vercel Environment Handoff

## Purpose

This records the Vercel environment setup completed for `MVP-024`.

Do not paste secret values into repository files, terminal output, screenshots,
or chat. Add server-only values directly in the Vercel dashboard or with
`vercel env add`.

## Confirmed project

```text
Team: kulibabkaaas-projects
Team ID: team_dEOZTC9lM8g7nJKPe4NU4PXW
Project: organize-my-music
Project ID: prj_78lnTMHyyYcqppVMFfwPBu31vimn
Production URL: https://organize-my-music.vercel.app
```

## Configured in Vercel

Production, Preview, and Development:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Production, Preview, and Development:

```text
ENCRYPTION_KEY
```

Production and Preview:

```text
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
APPLE_TEAM_ID
APPLE_KEY_ID
APPLE_PRIVATE_KEY
APPLE_MUSICKIT_KEY
OPENAI_API_KEY
SENTRY_DSN
```

Stripe values were intentionally deferred until payment is activated:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_SORT
```

## Preview deployment

```text
Deployment ID: dpl_376SpY9WvEQdwpFCZ6rCJTf6oPyB
Preview URL: https://organize-my-music-oap93gdsl-kulibabkaaas-projects.vercel.app
State: READY
```

## CLI add pattern

Use this pattern from the repo root for future env additions. Do not echo
secrets in shell history.

```bash
npx --yes vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx --yes vercel env add DATABASE_URL production
npx --yes vercel env add APPLE_TEAM_ID production
npx --yes vercel env add APPLE_KEY_ID production
npx --yes vercel env add APPLE_PRIVATE_KEY production
npx --yes vercel env add APPLE_MUSICKIT_KEY production
npx --yes vercel env add OPENAI_API_KEY production
```

Repeat for any needed environment scopes.

## Stop conditions

- Do not redeploy preview after changing env vars until the required variable
  set is complete.
- Do not store server secrets in `NEXT_PUBLIC_*`.
- Do not deploy Production from this worktree until all required checks pass and
  a preview deployment has been verified.
