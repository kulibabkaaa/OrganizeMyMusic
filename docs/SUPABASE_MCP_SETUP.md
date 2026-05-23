# Supabase MCP Setup

## Purpose

This file tells Codex how to use Supabase MCP for the OrganizeMyMusic MVP.

Supabase is used for:

- Auth.
- Postgres database.
- RLS policies.
- Migrations.
- Server-side worker data access.

## Scope

Codex may use Supabase MCP to:

- Inspect existing Supabase projects.
- Create a project only if none exists and the user has not already configured one.
- Inspect tables, migrations, and policies.
- Apply reviewed SQL migrations.
- Configure Auth settings needed for MVP.
- Verify data after local/dev testing.
- Record required environment variables.

Codex must not use Supabase MCP to:

- Delete projects.
- Drop production tables.
- Disable RLS globally.
- Expose service role keys to browser code.
- Create unrelated storage buckets or functions.
- Store raw Apple Music tokens.

## Required Supabase features

## Auth

MVP auth should support email login.

Recommended initial setup:

- Email/password or magic link.
- Auth redirect URL configured for local and Vercel environments.
- Profile row creation on first login.

## Database

The database should contain the existing MVP tables plus recommended additions:

- `profiles`
- `apple_music_connections`
- `library_syncs`
- `library_tracks_raw`
- `tracks_normalized`
- `track_ownership`
- `track_classifications`
- `playlist_requests`
- `sort_runs`
- `sort_playlists`
- `sort_playlist_tracks`
- `payments`
- `job_events`

## RLS

Enable RLS on user-owned tables.

Basic rule:

- Users can read their own rows.
- Users can insert/update only allowed rows they own.
- Worker/server service role can process jobs.
- Browser must never use service role key.

## Environment variables

Supabase MCP setup should produce or confirm:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
```

Only these are browser-safe:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

These are server-only:

```text
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
```

## Supabase MCP ticket behavior

When a roadmap ticket requires Supabase MCP:

1. Inspect existing project state.
2. Report what exists.
3. Apply only the required changes.
4. Avoid destructive changes.
5. Add migration files to the repo.
6. Verify the final state.
7. Record env var names that must be added to local `.env` and Vercel.

## Current setup status

`MVP-003` completed on 2026-05-22 with the existing Supabase project.

`MVP-005` completed on 2026-05-22 with the hosted database schema and RLS applied.

Confirmed project:

- Project ID/ref: `lxkinmyfcarpnynapewt`
- Project name: `kulibabagood@gmail.com's Project`
- Organization: `OrganizeYourMusic`
- Region: `us-west-2`
- Status: `ACTIVE_HEALTHY`
- API URL: `https://lxkinmyfcarpnynapewt.supabase.co`
- Database host: `db.lxkinmyfcarpnynapewt.supabase.co`
- Postgres: `17.6`

Confirmed access:

- Supabase MCP is authenticated and can list projects.
- A browser-safe publishable key exists.
- A legacy browser-safe anon key exists.
- Database SQL connection works.
- Auth schema exists and is available.
- Public schema has the MVP tables.
- Hosted migrations applied:
  - `20260522182145 initial_schema`
  - `20260522182345 restrict_authenticated_table_grants`
  - `20260522182441 add_missing_foreign_key_indexes`
  - `20260522184123 unique_apple_music_connections_user`
- Security advisor reports no lints.
- Performance advisor only reports unused indexes because the database is empty.

Local setup:

- `.mcp.json` points to `https://mcp.supabase.com/mcp`.
- Required Supabase env var names are present in `.env.example`.
- `NEXT_PUBLIC_SUPABASE_URL` is recorded in `.env.example`.
- Browser-safe key values were confirmed through MCP but not committed.
- Server-only values must be supplied through local `.env.local` and Vercel environment settings.
- `SUPABASE_SERVICE_ROLE_KEY` is required server-side for profile creation and worker/API writes.

## Suggested RLS policy pattern

For tables with `user_id`:

```sql
create policy "Users can read own rows"
on table_name
for select
using (auth.uid() = user_id);

create policy "Users can insert own rows"
on table_name
for insert
with check (auth.uid() = user_id);

create policy "Users can update own rows"
on table_name
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

Adjust per table. Some tables should not allow direct user updates if writes are controlled by API routes or workers.

## Migration safety

Before applying any migration through MCP, Codex should state:

```text
Migration file:
Tables changed:
Columns added:
Indexes added:
RLS policies changed:
Destructive operations:
Expected rollback difficulty:
```

If destructive operations are present, stop unless explicitly instructed.
