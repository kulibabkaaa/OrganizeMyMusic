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

The health check logs deployment revision metadata when the host exposes it.
For Railway, check the log line named `Worker deployment revision.` and compare
`revision.commitSha` with the Vercel production commit. If Railway does not
show a commit SHA, verify the service is connected to the same GitHub branch
manually in the Railway UI.

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

Production worker env checklist:

- `DATABASE_URL` points at the intended Supabase Postgres database.
- `NEXT_PUBLIC_SUPABASE_URL` points at the same Supabase project used by Vercel.
- `SUPABASE_SERVICE_ROLE_KEY` is present only on server/worker hosts.
- `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` are present together.
- `OPENAI_API_KEY` is present if classification can call OpenAI.
- `ENCRYPTION_KEY` matches the Vercel server value used to encrypt/decrypt
  Apple Music user tokens.
- `PAYMENTS_DEV_BYPASS_ENABLED` is absent or false in production.
- No raw Apple Music user token is configured as an environment variable.

## Deployment Steps

1. Create a Railway project.
2. Connect the `OrganizeMyMusic` GitHub repo.
3. Add a worker service from the repo.
4. Confirm Railway detected `railway.json`.
5. Add the required environment variables above.
6. Run `npm run worker:check` in the Railway shell or one-off command runner.
7. Start the worker service.
8. Confirm logs contain `Worker started and ready for library sync, full Sort, and playlist creation jobs.`
9. Confirm logs contain `Worker deployment revision.` with the expected commit
   SHA or branch.
10. Trigger one safe sync job from the web app after Apple Music auth works.
11. Confirm `job_events` receives worker progress without logging tokens.

## Health Check Steps

Run these before processing real user jobs:

1. Confirm the worker host has the expected environment variables from the
   checklist above.
2. Run:

   ```bash
   npm run worker:check
   ```

3. Confirm the command exits `0`.
4. Confirm logs include `Worker deployment revision.`.
5. Compare the logged `commitSha` or branch with the Vercel deployment.
6. Confirm the command does not log `DATABASE_URL`, service role, Apple private
   key, OpenAI key, encryption key, Stripe secret, or Apple Music user tokens.
7. Start or restart the persistent worker:

   ```bash
   npm run worker
   ```

8. Confirm logs include:

   ```text
   Worker started and ready for library sync, full Sort, and playlist creation jobs.
   ```

9. Queue one safe library sync from the app.
10. Confirm `job_events` records queued, started, and completed/failed stages
    with event types, counts, duration, and failure category if any.
11. Confirm no Apple Music write-back job runs until review/export confirmation.

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
- `npm run worker:check` now reports sanitized deployment revision metadata
  before checking pg-boss connectivity.
- The worker registers three pg-boss queues: library sync, full Sort generation,
  and reviewed Apple Music playlist creation.
  before testing database connectivity.
- Standalone worker commands load Next-style env files before validating worker
  configuration, so local `.env.local` values are available to the health check
  when they are populated.

## Stop Conditions

Stop instead of deploying when:

- `DATABASE_URL` is unavailable.
- The worker host cannot run a persistent Node process.
- `npm run worker:check` fails.
- Logs expose Apple Music user tokens or server secrets.
- The worker would create Apple Music playlists without confirmed sort runs.
- Worker revision does not match the intended web deployment and the mismatch
  is not explicitly approved.
