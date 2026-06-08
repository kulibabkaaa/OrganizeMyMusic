# Platform-First MVP Migration

## Product decision

Organize Your Music should become a library organization platform, not a one-time Sort utility.

The MVP keeps the first user action focused:

```text
Connect Apple Music
Sync library
Organize My Library
Create playlist plans
Generate proposed tracks
Review every playlist and track
Export to Apple Music
```

After that first organization, the user's durable workspace is their saved playlists.

## Product objects

### Library

The connected Apple Music library and the indexed tracks available to organize.

### Playlist

A persistent app-owned playlist object.

Examples:

- Ukrainian Rap
- Deep Work
- Late Night Jazz
- Gym Playlist

A playlist may have an `apple_playlist_id` after export. For MVP, the app should only manage playlists created through the app.

### Recipe

The saved rules attached to a playlist.

Recipes contain:

- Playlist name
- Description or note
- Tags
- Mood
- Genres
- Energy
- Explicit preference
- Target track range
- Extra instructions

Recipes are mostly edited through product controls, not chat.

### Generation

An AI/deterministic attempt to fill a playlist from the user's indexed Apple Music library.

A generation stores the recipe snapshot, proposed tracks, scores, reasons, and user keep/remove decisions.

### Export

The explicit user-approved write to Apple Music.

No playlist write happens before review and confirmation.

### Sort

A full-library organization project.

A Sort is no longer the normal way to create one playlist. It is the batch workspace for initial organization or major restructuring.

## Target routes

```text
/app                         Dashboard
/app/sorts/new               Organize My Library
/app/sorts/[sortId]/builder  Batch playlist/recipe builder
/app/sorts/[sortId]/review   Review generated batch results
/app/playlists               Persistent playlist hub
/app/playlists/new           Create one playlist
/app/playlists/[playlistId]  Playlist tracks, recipe, suggestions, history
/app/library                 Apple Music library status
/app/settings/libraries      Provider settings
```

`/app/sorts` remains for full-library projects. It should not be the daily home.

## MVP screen strategy

### Dashboard

Keep it simple.

Show:

- Apple Music connected/sync status
- Primary action: `Organize My Library`
- Secondary action: `Create Playlist`
- Saved playlists summary
- Review-needed queue
- New music queue

Avoid dense analytics or billing surfaces in MVP.

### Sort Builder

Use a two-pane workspace:

- Left: playlists in this Sort
- Right: selected playlist recipe editor

This is the first-time "organize my whole library" flow.

### Playlist Hub

Use this as the recurring-value screen:

- Saved playlists
- Recipe status
- Pending suggestions
- Regenerate
- Review
- Export approved tracks
- Generation history

## Data migration strategy

Use an additive bridge first.

1. Add persistent `playlists`.
2. Add `playlist_id` to `playlist_recipes` while keeping `sort_run_id`.
3. Add `playlist_generations` and `playlist_generation_tracks`.
4. Add `playlist_exports`.
5. Add `playlist_id` to `sort_playlists` so old Sort results can link to durable playlists.
6. Move UI and services to playlist-owned recipes.
7. Keep Sort routes working during migration.

Do not delete `sort_playlists` or `sort_playlist_tracks` until the new generation/export flow has replaced them.

## Apple Music constraint

Apple Music supports creating library playlists and adding tracks to existing library playlists. Exact replacement, track removal, and reordering need a separate implementation spike before the product promises perfect in-place updates.

Update-oriented Apple Music wording should wait until the capability is verified. Until then, prefer `Export` or `Add approved tracks`.

## Implementation tickets

### PFM-001 Persistent playlist schema

Add playlists, generations, generation tracks, exports, and bridge columns.

Acceptance:

- Migration is additive.
- RLS protects user-owned rows.
- Existing Sort pipeline is not removed.
- Types describe the new objects.

### PFM-002 Playlist service foundation

Add server modules for playlist CRUD and recipe ownership by playlist.

Acceptance:

- Create/list/update/archive playlist.
- Create/update/list recipe for playlist.
- Tests cover validation and ownership mapping.

### PFM-003 Dashboard simplification

Update navigation and dashboard to make `Organize My Library` primary and saved playlists visible.

Acceptance:

- Dashboard is less dense.
- `Playlists` becomes a primary nav item.
- No billing emphasis.

Current MVP implementation:

- `/app` is the canonical dashboard route.
- `/dashboard` redirects to `/app` for compatibility with old links.
- The dashboard uses state-based product copy instead of pipeline placeholders.
- Ready dashboards show saved playlist, review, and new-music queues.

### PFM-004 Sort Builder v2

Adapt the current builder into the two-pane playlist/recipe workspace.

Acceptance:

- Left pane manages playlist drafts in the Sort.
- Right pane edits selected playlist recipe.
- Autosave stays.
- Preview remains blocked until library sync is ready.

### PFM-005 Persistent playlist hub

Add `/app/playlists` and `/app/playlists/[playlistId]`.

Acceptance:

- User sees playlists created by Sorts or one-off creation.
- User can inspect tracks, recipe, suggestions, and history.

Current MVP implementation:

- Playlist hub cards show the latest generation state so review/export work is
  visible before opening a playlist.
- Playlist detail lets users edit and save the playlist-owned recipe inline
  before regenerating.
- Playlist detail lets users archive an app playlist while explicitly stating
  that Apple Music playlists and library tracks are not changed.
- Playlist detail shows the latest generation for track-level review.
- Playlist detail keeps export controls inside the review panel and collapses
  generation history by default to reduce MVP screen density.

### PFM-006 Generation model migration

Store proposed tracks in playlist generations, not only Sort snapshots.

Acceptance:

- One playlist can be regenerated without creating a Sort.
- Sort generation can generate many playlist generations.

### PFM-007 Review and export migration

Review works from playlist generations and still supports Sort batch review.

Acceptance:

- User can edit every proposed track.
- Export is explicit.
- Apple Music writes remain server-side.

Current MVP implementation:

- Paid full-organization runs export from stored review playlists after explicit user confirmation.
- Sort export queues `playlist-create`; the worker writes Apple playlist IDs back to persistent playlist records.
- Individual playlist export requires the user to save the track review before
  Apple Music export can be queued.
- Individual track toggles persist keep/remove decisions but do not mark the
  generation reviewed until the user clicks `Mark Review Complete`.
- Individual playlist export queue handoff failures mark the generation/export
  failed with a privacy-safe summary instead of leaving them stuck in
  `exporting`.
- Archived app playlists are removed from the active workspace and cannot be
  edited, generated, reviewed, or exported.
- Individual playlist export failure summaries are privacy-safe and do not persist raw Apple Music tokens or track names.

### PFM-008 New music processing

Add user-triggered processing for tracks added since the latest completed sync.

Acceptance:

- User can process new tracks only.
- App suggests existing playlists.
- User reviews before export/update.

Current MVP implementation:

- `/api/app/new-music/process` compares the latest completed sync with the previous completed sync.
- Saved playlists record `last_processed_new_music_sync_id`, so processing the
  same latest sync does not keep re-suggesting the same new songs forever.
- The library page `Process New Music` action stores matching recommendations
  as playlist generations in `ready_for_review`, then links each
  recommendation back to its playlist workspace for recipe adjustment, track
  review, and explicit export.
- Persisting new-music generations is retry-safe for a playlist/latest-sync
  pair: if a matching `new_music` generation already exists, processing updates
  playlist state instead of inserting duplicate generation rows.
- No Apple Music playlist is updated automatically.

## Inputs needed from product owner

Not required for PFM-001 through PFM-005:

- Billing rules
- Exact subscription limits
- Visual redesign beyond the approved dark workspace direction

Needed before PFM-007/PFM-008:

- Decide MVP language if Apple Music cannot remove/reorder tracks.
- Decide whether updates append approved tracks or recreate managed playlists.
- Decide whether app-created Apple playlists may be archived/replaced.
