# Deployment and Operations

## Deployment split

The MVP needs two runtime surfaces:

1. Web app/API routes.
2. Persistent worker process.

Vercel can host the web app. The worker should run on a persistent Node runtime.

## Web app

Recommended host:

```text
Vercel
```

Responsibilities:

- Landing page.
- Dashboard.
- Auth callbacks.
- API routes.
- Preview and confirmation UI.

## Worker

The worker runs:

```bash
npm run worker
```

Responsibilities:

- Apple Music library sync.
- Normalization.
- Dedupe.
- Classification.
- Playlist planning.
- Apple Music playlist creation.

Do not assume Vercel serverless can host a persistent `pg-boss` worker.

Selected MVP worker host:

```text
Railway
```

Reason:

- It can run one persistent Node service with a normal start command.
- It can use the same GitHub repo as the Vercel web app.
- It can store server-only env vars separately from browser code.
- It is simpler than introducing a container platform for the first smoke test.

Fallback worker hosts:

- Render.
- Fly.io.
- VPS.
- Any persistent Node process host with access to `DATABASE_URL`.

Current platform-first worker status:

- Railway is the selected worker host and GitHub reports a successful Railway
  deployment for merged `main` commits.
  Production smoke still needs to prove `full-sort` and
  `playlist-generation-export` processing with real Apple Music data.
- The worker must run with `npm run worker`, outside Vercel serverless request
  lifecycle.
- The Supabase pooler `DATABASE_URL` must let pg-boss connect and initialize
  the `pgboss` schema.
- `railway.json` configures Railway to build with Railpack and start with
  `npm run worker`.
- `package.json` pins Node to `24.x`, matching the Vercel project runtime.
- `tsx` is installed as a production dependency because the worker start command
  executes TypeScript directly.
- Supabase reports RLS disabled on `pgboss` internal tables. Review schema
  exposure before changing this, because enabling RLS without compatible
  policies can break pg-boss.

## Supabase

Supabase handles:

- Auth.
- Postgres.
- RLS.
- Database inspection via MCP.

## Vercel deployment checklist

- Build passes.
- Required env vars exist.
- Public variables are only `NEXT_PUBLIC_*`.
- Server secrets are server-only.
- Preview deployment works.
- Auth redirect URLs include deployment URL.
- `/api/health` returns the deployed web revision without exposing secrets.

Current platform-first web deployment status:

- Vercel project `kulibabkaaas-projects/organize-my-music` is linked locally.
- Vercel MCP can inspect the project and deployments.
- Platform-first PR #1 is merged to `main`, and Vercel Production deploys the
  current `main` branch.
- Public Production, Preview, and Development env vars were added for
  `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `ENCRYPTION_KEY` already exists in Vercel for Production, Preview, and
  Development.
- Required server-only Supabase, Apple Music, OpenAI, database, and Sentry env
  values exist for Production and Preview.
- Stripe env vars are intentionally deferred until payment is activated.
- Landing page, `/dashboard`, and `/api/health` return `200` in Production
  before starting the Apple Music smoke path.
- `npm run smoke:preflight` verifies those safe production routes plus Vercel
  and Railway GitHub deployment statuses without touching Apple Music or
  creating jobs.
- Record real Apple Music smoke proof in
  `docs/PLATFORM_FIRST_SMOKE_EVIDENCE.md`.

## Worker deployment checklist

- Worker has `DATABASE_URL`.
- Worker has `SUPABASE_SERVICE_ROLE_KEY` if needed.
- Worker has Apple and OpenAI server secrets.
- Worker health check passes with `npm run worker:check`.
- Production smoke preflight passes with `npm run smoke:preflight`.
- Worker health check logs the deployed worker revision.
- Worker starts successfully.
- Worker can process one test job.
- Worker logs do not expose secrets.
- Worker emits job events.

## Operational dashboards

Minimum useful visibility:

- Latest library syncs.
- Sort runs by state.
- Failed jobs.
- Job events.
- Apple write-back failures.

## Error handling

User-facing errors should be simple:

```text
Apple Music connection expired. Please reconnect.
Library sync failed. Retry.
Playlist creation partially failed. Retry remaining playlists.
```

Developer logs should include structured context but not secrets.

## Backup and retention

For MVP:

- Keep raw payloads for reprocessing.
- Consider user deletion later.
- Do not build complex retention policies until MVP works.

## Production smoke test

A production smoke test must verify:

- Auth.
- Apple Music connection.
- Sync.
- Classification.
- Preview.
- Confirmation.
- Apple Music write-back.

Current `MVP-026` status:

- Current MVP worktree was deployed to Vercel Production on 2026-05-23 as
  `dpl_BFfhH5dLXiQFcpC96E7XBtdX4ZQg`.
- Production alias `https://organize-my-music.vercel.app` responds publicly.
- Safe smoke checks for `/`, `/dashboard`, and `/login` returned `200`.
- Remaining blocker: confirm Vercel Production `DATABASE_URL` works through an
  authenticated sync request. Sensitive Vercel env values cannot be
  independently read back from CLI/MCP.
- The manual smoke path is documented in `docs/PRODUCTION_SMOKE_TEST.md`.
- Apple Music write-back must be performed only by the real user after they
  inspect and explicitly confirm the preview.
