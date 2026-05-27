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
- Platform dashboard (`/app`) and legacy dashboard redirects while migration is in progress.
- Auth callbacks.
- API routes.
- Preview, review, and export UI.

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

Current `MVP-025` status:

- Worker deployment is complete on Railway.
- Railway runs the persistent worker with `npm run worker`, outside Vercel
  serverless request lifecycle.
- The corrected Supabase pooler `DATABASE_URL` lets pg-boss connect and
  initialize the `pgboss` schema.
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

Current status for `MVP-024`:

- Vercel project `kulibabkaaas-projects/organize-my-music` is linked locally.
- Vercel MCP can inspect the project and deployments.
- Existing Production deployment `dpl_B4MyqtXZjRT4cXEPBy6DbMyFnLYw` is `READY`,
  but it was built from an older `main` commit and is not the current MVP
  worktree.
- Public Production, Preview, and Development env vars were added for
  `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `ENCRYPTION_KEY` already exists in Vercel for Production, Preview, and
  Development.
- Required server-only Supabase, Apple Music, OpenAI, database, and Sentry env
  values exist for Production and Preview.
- Stripe env vars are intentionally deferred until payment is activated.
- Preview deployment `dpl_376SpY9WvEQdwpFCZ6rCJTf6oPyB` is `READY` at
  `https://organize-my-music-oap93gdsl-kulibabkaaas-projects.vercel.app`.
- Landing page and signed-out dashboard smoke checks returned `200`.

## Worker deployment checklist

- Worker has `DATABASE_URL`.
- Worker has `SUPABASE_SERVICE_ROLE_KEY` if needed.
- Worker has Apple and OpenAI server secrets.
- Worker health check passes with `npm run worker:check`.
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
- Review and explicit export confirmation.
- Apple Music write-back.

Current `MVP-026` status:

- Current MVP worktree was deployed to Vercel Production on 2026-05-23.
- Production alias `https://organize-my-music.vercel.app` responds publicly.
- Safe smoke checks for `/`, `/dashboard`, and `/login` returned `200`.
- Vercel Production `DATABASE_URL` was validated indirectly through the
  authenticated production sync request.
- The manual smoke path is documented in `docs/PRODUCTION_SMOKE_TEST.md`.
- Apple Music write-back must be performed only by the real user after they
  inspect and explicitly confirm the preview or, in the platform UI, the export
  review screen.
