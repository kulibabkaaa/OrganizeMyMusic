# Worker Deployment

## Purpose

The worker processes long-running `pg-boss` jobs for library sync and Apple
Music playlist creation. It must run as a persistent process outside Vercel
serverless.

## Selected MVP Host

Use Railway for the MVP worker.

Reasons:

- Persistent Node process support.
- Simple GitHub repo deployment.
- Per-service environment variables.
- Fast enough to validate one real Apple Music smoke test.

Do not run the worker as a Vercel Function or Vercel Cron job.

## Commands

Health check:

```bash
npm run worker:check
```

Persistent worker:

```bash
npm run worker
```

Railway service start command:

```bash
npm run worker
```

Railway build command:

```bash
npm install
```

`railway.json` is committed at the repo root so Railway can apply the worker
start command from code. Railway's config-as-code docs say `railway.json` or
`railway.toml` can define deployment settings, and its build/start command docs
allow overriding the start command for a service.

`tsx` is a production dependency because the deployed worker start command uses
it directly.

## Required Environment Variables

Configure these on the worker host as server-only values:

```text
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
APPLE_TEAM_ID
APPLE_KEY_ID
APPLE_PRIVATE_KEY
APPLE_MUSICKIT_KEY
OPENAI_API_KEY
ENCRYPTION_KEY
```

Optional until payment is active:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_SORT
SENTRY_DSN
```

`NEXT_PUBLIC_SUPABASE_URL` is browser-safe by name, but the worker still reads
it as configuration. Do not add service role, database, Apple, OpenAI, Stripe,
or encryption values to `NEXT_PUBLIC_*` variables.

## Deployment Steps

1. Create a Railway project.
2. Connect the `OrganizeMyMusic` GitHub repo.
3. Add a worker service from the repo.
4. Confirm Railway detected `railway.json`.
5. Add the required environment variables above.
6. Run `npm run worker:check` in the Railway shell or one-off command runner.
7. Start the worker service.
8. Confirm logs contain `Worker started and ready for library sync and playlist creation jobs.`
9. Trigger one safe sync job from the web app after Apple Music auth works.
10. Confirm `job_events` receives worker progress without logging tokens.

## Verification Status

As of 2026-05-23:

- Supabase Postgres is reachable through Supabase MCP.
- Public MVP tables exist with RLS enabled.
- Railway runs `npm run worker` as the persistent MVP worker.
- Supabase MCP confirms the deployed worker initialized the `pgboss` schema and
  internal tables.
- Supabase reports RLS disabled on `pgboss` internal tables. Review schema
  exposure before changing this, because enabling RLS without compatible
  policies can break pg-boss.
- `npm run worker:check` exists for non-destructive database connectivity
  checks when a usable `DATABASE_URL` is available locally or in the host shell.

## Stop Conditions

Stop instead of deploying when:

- `DATABASE_URL` is unavailable.
- The worker host cannot run a persistent Node process.
- `npm run worker:check` fails.
- Logs expose Apple Music user tokens or server secrets.
- The worker would create Apple Music playlists without confirmed sort runs.
