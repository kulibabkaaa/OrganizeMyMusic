# Database Model

## Current direction

The existing schema is broadly correct for the product. It already separates:

- User profiles.
- Apple Music connections.
- Library sync runs.
- Raw track payloads.
- Normalized tracks.
- Track ownership.
- Track classifications.
- Sort runs.
- Generated playlists.
- Generated playlist tracks.
- Payments.
- Job events.

That separation should be preserved.

## Required tables

## `profiles`

Stores app-level user profile.

Important fields:

- `id`
- `email`
- `is_admin`
- `created_at`

Rules:

- One row per authenticated user.
- User can read own profile.
- Admin-only fields should not be user-editable.

## `apple_music_connections`

Stores Apple Music authorization state.

Important fields:

- `user_id`
- `storefront`
- `encrypted_user_token`
- `token_encryption_version`
- `status`
- `last_validated_at`
- `created_at`
- `updated_at`

Rules:

- Raw user token must never be stored.
- Token should be encrypted using server-only `ENCRYPTION_KEY`.
- User can see connection status, not raw token.

## `library_syncs`

Tracks each library sync run.

Important fields:

- `user_id`
- `status`
- `raw_track_count`
- `normalized_track_count`
- `duplicate_count`
- `error_summary`
- `created_at`
- `updated_at`

Recommended status values:

```text
queued
syncing
normalizing
completed
failed
```

## `library_tracks_raw`

Stores raw Apple Music track payloads.

Important fields:

- `sync_id`
- `apple_song_id`
- `payload jsonb`
- `created_at`

Rules:

- Store raw Apple response for reprocessing.
- Raw payload is user music data and must be private.

## `tracks_normalized`

Stores canonical track records.

Important fields:

- `fingerprint`
- `apple_song_id`
- `isrc`
- `name`
- `artist_name`
- `album_name`
- `normalized_name`
- `normalized_artist`
- `normalized_album`
- `duration_in_millis`
- `genre_names`
- `content_rating`

Rules:

- Use ISRC as strongest dedupe signal.
- Use fingerprint fallback when ISRC is absent.
- Do not assume Apple song ID is globally stable across every context.

## `track_ownership`

Links normalized tracks to a user's library sync.

Important fields:

- `user_id`
- `sync_id`
- `normalized_track_id`

Rules:

- User owns access to tracks through this table.
- Do not expose another user's ownership.

## `track_classifications`

Stores classification outputs.

Important fields:

- `normalized_track_id`
- `version`
- `metadata_hash`
- `language`
- `genre`
- `subgenres`
- `moods`
- `energy`
- `confidence`
- `source`

Recommended changes:

```sql
alter table track_classifications
add column if not exists subgenres text[] not null default '{}',
add column if not exists energy numeric(4,3);
```

Recommended language handling:

Do not use a tiny hard-coded language set. At minimum support:

```text
english
ukrainian
russian
polish
spanish
french
german
japanese
korean
portuguese
instrumental
mixed
unknown
```

## `playlist_requests`

Recommended new table.

Stores the user's original requested playlists.

```sql
create table if not exists playlist_requests (
  id uuid primary key default gen_random_uuid(),
  sort_run_id uuid not null references sort_runs(id) on delete cascade,
  user_prompt text not null,
  parsed_rules jsonb,
  created_at timestamptz not null default now()
);
```

## `sort_runs`

Tracks a playlist organization run.

Important fields:

- `user_id`
- `library_sync_id`
- `name`
- `source_provider`
- `state`
- `payment_status`
- `preview_snapshot`
- `stripe_checkout_session_id`
- `price_cents`
- `created_at`
- `updated_at`

Rules:

- Preview snapshot should become immutable after confirmation/payment begins.
- Payment can remain unused until core MVP works.
- MVP-018 stores `preview_snapshot` when playlist requests are planned.
- Preview regeneration is blocked once state reaches `awaiting_payment`, `paid`, `creating_playlists`, or `completed`.

Platform UI note: user-facing statuses should be derived through a UI adapter
instead of renaming database states immediately. The target UI lifecycle is
documented in `UI_PLATFORM_FLOW_ROADMAP.md`.

FLOW-015 adds `name` and `source_provider` to support reusable Sort drafts
before a completed library sync exists. `source_provider` is constrained to
`apple_music` for the MVP.

## `playlist_recipes`

The platform UI roadmap adds structured Playlist Recipes as the replacement for
textarea-only playlist requests. Keep existing `playlist_requests` rows for old
Sorts and compatibility APIs.

Implemented by `supabase/migrations/0002_playlist_recipes.sql`.

Fields:

- `user_id`
- `sort_run_id`
- `position`
- `name`
- `playlist_note`
- target track min/max
- duplicate policy
- explicit-track preference
- library-only preference
- structured `tags` JSON

RLS must scope recipes to the owning user. Tags and Tag Notes are private user
sorting instructions and should not be logged with raw library data.

Application code validates recipe create/update input with Zod in
`src/modules/playlist-recipes/schema.ts`. The compatibility adapter in
`src/modules/playlist-recipes/adapter.ts` converts structured Playlist Recipes
into the existing parsed playlist request rules so old Sorts and the current
planner path can continue to work during the UI migration.

## `sort_playlists`

Stores generated playlists.

Important fields:

- `sort_run_id`
- `title`
- `description`
- `confidence_label`
- `apple_playlist_id`

Recommended changes:

```sql
alter table sort_playlists
add column if not exists playlist_rules jsonb,
add column if not exists selected boolean not null default true;
```

Avoid relying only on a single `dimension` field. Real playlists combine language, genre, mood, era, explicitness, and use case.

MVP-018 uses `dimension = request` for requested multi-dimensional playlists.

## `sort_playlist_tracks`

Stores planned tracks inside generated playlists.

Important fields:

- `sort_playlist_id`
- `normalized_track_id`
- `position`

Recommended changes:

```sql
alter table sort_playlist_tracks
add column if not exists score numeric(4,3),
add column if not exists reason text,
add column if not exists removed_by_user boolean not null default false;
```

MVP-018 stores planned track `score` and `reason` here for preview display.

## `job_events`

Stores visible job progress and errors.

Important fields:

- `sort_run_id`
- `stage`
- `level`
- `message`
- `details jsonb`
- `created_at`

Recommended addition:

```sql
alter table job_events
add column if not exists library_sync_id uuid references library_syncs(id) on delete cascade;
```

## RLS requirements

RLS is enabled on user-owned tables:

- `profiles`
- `apple_music_connections`
- `library_syncs`
- `library_tracks_raw`
- `track_ownership`
- `sort_runs`
- `sort_playlists`
- `sort_playlist_tracks`
- `payments`
- `job_events`
- `playlist_requests`

Authenticated browser clients currently have no direct table grants. Server routes and workers should use the server-only Supabase service role client for writes and sensitive reads. RLS policies remain in place so any future direct grants must stay user-scoped.

## Migration discipline

- Never edit an already-applied production migration destructively.
- Add new numbered migrations.
- Keep migrations idempotent where practical.
- Document risky migrations before applying them with Supabase MCP.
