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
- Persistent playlists.
- Playlist recipes.
- Playlist generations.
- Playlist generation tracks.
- Playlist exports.
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

## `playlists`

Stores persistent app playlist objects.

Important fields:

- `user_id`
- `source_provider`
- `name`
- `description`
- `status`
- `apple_playlist_id`
- `created_from_sort_run_id`
- `latest_library_sync_id`
- `last_processed_new_music_sync_id`
- `last_generated_at`
- `last_exported_at`
- `archived_at`

Rules:

- MVP supports only `apple_music`.
- Only app-created playlists should be managed in MVP.
- `apple_playlist_id` is set after export.
- `last_processed_new_music_sync_id` records the latest completed sync that was
  checked for user-triggered new-music recommendations for this playlist.
- Archive instead of hard-delete in user-facing flows.

## `playlist_recipes`

Stores rules for a playlist.

Current migration rule:

- `playlist_id` is the target owner.
- `sort_run_id` remains as a temporary bridge for existing Sort flows.
- A row must have at least one of `playlist_id` or `sort_run_id`.

Important fields:

- `playlist_id`
- `sort_run_id`
- `name`
- `playlist_note`
- `target_track_min`
- `target_track_max`
- `duplicate_policy`
- `allow_explicit`
- `include_library_only`
- `tags jsonb`

## `playlist_generations`

Stores each attempt to fill one playlist from the user's library.

Important fields:

- `playlist_id`
- `recipe_id`
- `sort_run_id`
- `library_sync_id`
- `status`
- `recipe_snapshot`
- `generated_at`
- `error_summary`

Rules:

- Store a recipe snapshot so review stays stable after recipe edits.
- A generation can be created by a Sort or by one-off playlist regeneration.

## `playlist_generation_tracks`

Stores proposed tracks for a generation.

Important fields:

- `generation_id`
- `normalized_track_id`
- `position`
- `score`
- `reason`
- `decision`

Rules:

- `decision` starts as `keep`.
- User review changes `decision` to `remove`.
- Do not write removed tracks to Apple Music.

## `playlist_exports`

Stores explicit Apple Music write attempts.

Important fields:

- `playlist_id`
- `generation_id`
- `sort_run_id`
- `apple_playlist_id`
- `status`
- `selected_track_count`
- `error_summary`

Rules:

- Export requires explicit user confirmation.
- Worker writes to Apple Music server-side.
- Store partial failure state for support/retry.

## `playlist_requests`

Stores the user's original requested playlists.

Legacy note: this remains useful for natural-language request flows, but platform-first playlist recipes should become the primary model.

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

Tracks a full-library organization project.

Important fields:

- `user_id`
- `library_sync_id`
- `state`
- `payment_status`
- `preview_snapshot`
- `stripe_checkout_session_id`
- `price_cents`
- `created_at`
- `updated_at`

Rules:

- A Sort is for initial library organization or major restructuring.
- One-off playlist creation should not require a Sort.
- Preview snapshot should become immutable after confirmation/payment begins.
- Payment can remain unused until core MVP works.
- MVP-018 stores `preview_snapshot` when playlist requests are planned.
- Preview regeneration is blocked once state reaches `awaiting_payment`, `paid`, `creating_playlists`, or `completed`.

## `sort_playlists`

Stores generated playlists.

Migration note: `sort_playlists.playlist_id` can link a generated Sort result to a persistent `playlists` row.

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
