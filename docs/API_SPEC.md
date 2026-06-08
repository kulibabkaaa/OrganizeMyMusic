# API Spec

## Principles

- API routes must validate input with Zod where practical.
- API routes must use authenticated user context.
- API routes must not expose secrets.
- API routes should be thin and call server modules.
- Long-running work should be queued, not done inside request-response routes.

## Planned routes

## Auth/profile

### `GET /api/me`

Returns the current authenticated profile.

Response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "profile": {
    "id": "uuid",
    "isAdmin": false
  }
}
```

## Apple Music

### `GET /api/apple/developer-token`

Returns an Apple Music developer token for MusicKit browser authorization.

Rules:

- Must be generated server-side.
- Must not expose private key.
- Requires an authenticated app session.
- Returns `503` with missing environment variable names when Apple developer credentials are not configured.

Response:

```json
{
  "developerToken": "jwt",
  "expiresAt": "2026-01-01T00:00:00.000Z"
}
```

### `POST /api/apple/connect`

Stores Apple Music user token.

Request:

```json
{
  "musicUserToken": "token",
  "storefront": "gb"
}
```

Response:

```json
{
  "status": "connected",
  "storefront": "gb"
}
```

Rules:

- Token must be encrypted before storage.
- Raw token must not be logged.
- Requires authenticated user.
- The response must not include the raw token.
- Stores only encrypted token data in `apple_music_connections`.

### `GET /api/apple/connection`

Returns current Apple Music connection status.

Response:

```json
{
  "status": "connected",
  "storefront": "gb",
  "lastValidatedAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

If the user has not connected Apple Music:

```json
{
  "status": "disconnected",
  "storefront": null,
  "lastValidatedAt": null,
  "updatedAt": null
}
```

Rules:

- Requires authenticated user.
- Does not return raw or encrypted Apple Music user tokens.
- May return `connected`, `expired`, `revoked`, `error`, or `disconnected`.

## Library sync

### `POST /api/library-syncs`

Starts a library sync job.

Response:

```json
{
  "syncId": "uuid",
  "status": "queued"
}
```

Rules:

- Requires Apple Music connection.
- Creates `library_syncs` row.
- Queues `pg-boss` job.
- Records a `job_events` row.
- Worker fetches Apple Music library songs and stores raw responses in `library_tracks_raw`.
- Worker updates `rawTrackCount` and records failures in `errorSummary`.
- Worker normalizes and dedupes fetched tracks into `tracks_normalized`.
- Worker links owned normalized tracks through `track_ownership`.
- Worker updates `normalizedTrackCount` and `duplicateCount`.

### `GET /api/library-syncs/:syncId`

Returns sync status.

Response:

```json
{
  "id": "uuid",
  "status": "syncing",
  "rawTrackCount": 500,
  "normalizedTrackCount": 480,
  "duplicateCount": 20,
  "errorSummary": null
}
```

### `GET /api/library-syncs`

Returns latest library sync summary and track count.

## Sort runs

Platform-first note: Sort runs are for full-library organization. One-off playlist creation should use `/api/app/playlists`.

Legacy `/api/sort-runs/*` routes remain for compatibility. New app surfaces use
`/api/app/sorts/*`.

Disabled legacy write/start endpoints return `409` with `nextPath` and
`nextApiPath` so stale clients can move into the platform workflow without
reopening legacy write-back.

## App Sorts

### `POST /api/app/sorts`

Creates a platform Sort draft for full-library organization.

Rules:

- Requires authenticated user.
- Uses the latest completed library sync unless `librarySyncId` is provided.
- Stores Sort metadata only; no Apple Music write occurs.

Response includes:

```json
{
  "status": "created",
  "sort": {
    "id": "uuid",
    "name": "My Apple Music organization"
  }
}
```

### `GET /api/app/sorts/:sortId`

Returns a user-owned Sort draft, its playlist recipes, and preview readiness.

### `PATCH /api/app/sorts/:sortId`

Updates Sort draft metadata and library sync selection.

### `GET /api/app/sorts/:sortId/recipes`

Returns playlist recipes inside a Sort.

### `POST /api/app/sorts/:sortId/recipes`

Creates a playlist recipe inside a Sort.

### `PATCH /api/app/sorts/:sortId/recipes`

Reorders playlist recipes inside a Sort.

### `PATCH /api/app/sorts/:sortId/recipes/:recipeId`

Updates one playlist recipe inside a Sort.

### `DELETE /api/app/sorts/:sortId/recipes/:recipeId`

Deletes one playlist recipe inside a Sort.

### `POST /api/app/sorts/:sortId/preview`

Generates or returns a lightweight preview snapshot after library sync is ready.

Rules:

- Requires authenticated user.
- Requires completed library sync.
- Requires at least one playlist recipe.
- Does not write to Apple Music.

### `POST /api/app/sorts/:sortId/start`

Canonical start endpoint used by `/app/sorts/:sortId/start`. In the default
MVP configuration it starts billing-deferred full-library organization. If
payments are explicitly enabled, it can create a Stripe billing session.

Rules:

- Requires authenticated user.
- Queues `full-sort` when billing-deferred access, Stripe billing, or the
  approved development bypass unlocks processing.
- Does not write to Apple Music.

### `POST /api/app/sorts/:sortId/checkout`

Compatibility endpoint for older app clients. It reuses
`POST /api/app/sorts/:sortId/start`.

### `POST /api/app/sorts/:sortId/export`

Queues reviewed Sort playlist export to Apple Music.

Rules:

- Requires authenticated user.
- Requires explicit user action.
- Persists playlists approved for export and removed tracks.
- Queues `playlist-create` for the persistent worker.
- Does not promise exact replacement, reorder, or automatic removal in Apple Music.

### `POST /api/sort-runs`

Legacy playlist-request Sort creation is disabled.

Rules:

- Requires authenticated user.
- Does not create Sort rows.
- Does not generate preview snapshots.
- Returns `409` with platform migration targets.

Response:

```json
{
  "error": "Legacy playlist-request Sort creation is disabled. Create a platform Sort draft and add structured playlist recipes instead.",
  "nextPath": "/app/sorts/new",
  "nextApiPath": "/api/app/sorts"
}
```

### `POST /api/sort-runs/:sortRunId/checkout`

Legacy endpoint. Returns `409`.

Rules:

- Does not unlock full-organization processing.
- Does not mark a Sort paid.
- New app surfaces must route users through `/app/sorts/:sortId/start`; that
  page calls `POST /api/app/sorts/:sortId/start` internally.

### `GET /api/sort-runs/:sortRunId`

Returns sort run status.

Response includes:

```json
{
  "sortRunId": "uuid",
  "state": "preview_ready",
  "paymentStatus": "pending",
  "nextPath": "/app/sorts/uuid",
  "nextApiPath": "/api/app/sorts/uuid",
  "previewSnapshot": {
    "playlists": []
  },
  "playlistRequests": []
}
```

### `POST /api/sort-runs/:sortRunId/confirm`

Legacy confirmation is disabled. Returns `409`.

Request:

```json
{
  "selectedPlaylistIds": ["preview-playlist-id-1", "preview-playlist-id-2"],
  "removedTrackFingerprintsByPlaylistId": {
    "preview-playlist-id-1": ["track-fingerprint"]
  }
}
```

Response:

```json
{
  "error": "Legacy Sort confirmation is disabled. Review the Sort in the platform workflow before exporting approved tracks.",
  "nextPath": "/app/sorts/uuid/review",
  "nextApiPath": "/api/app/sorts/uuid/export"
}
```

Rules:

- Must require explicit user action.
- Does not confirm playlists.
- Does not queue playlist creation.
- New app surfaces must route users through `/app/sorts/:sortId/review`; that
  page calls `POST /api/app/sorts/:sortId/export` after review.

### Unsupported legacy subroutes

These legacy subroutes are not active platform routes:

- `GET /api/sort-runs/:sortRunId/preview`
- `GET /api/sort-runs/:sortRunId/events`

Use `POST /api/app/sorts/:sortId/preview` for Sort previews. Job events are
currently internal implementation details and are not exposed through a public
platform endpoint.

## New Music

### `POST /api/app/new-music/process`

Processes tracks that exist in the latest completed sync but not the previous
completed sync.

Rules:

- Requires authenticated user.
- Requires two completed library syncs.
- Uses saved app playlist recipes.
- Stores matching recommendations as `ready_for_review` playlist generations.
- Returns review-only recommendation summaries for the current request.
- Reuses an existing `new_music` generation for the same playlist/latest-sync
  pair instead of duplicating review queues on retry.
- Does not write to Apple Music.
- Does not update existing Apple Music playlists automatically.

Response:

```json
{
  "status": "processed",
  "summary": {
    "latestSyncId": "uuid",
    "previousSyncId": "uuid",
    "newTrackCount": 4,
    "canProcess": true,
    "message": "4 new songs detected since the previous sync."
  },
  "recommendations": [
    {
      "playlistId": "uuid",
      "playlistName": "Ukrainian Rap",
      "recipeId": "uuid",
      "recipeName": "Ukrainian Rap",
      "trackCount": 2,
      "tracks": [
        {
          "normalizedTrackId": "uuid",
          "appleSongId": "i.xxxxx",
          "name": "Song",
          "artistName": "Artist",
          "albumName": "Album",
          "score": 0.88,
          "reason": "Matched language and genre recipe tags."
        }
      ]
    }
  ]
}
```

## Platform playlists

### `GET /api/app/playlists`

Returns non-archived persistent playlists for the current user.

Response:

```json
{
  "playlists": [
    {
      "id": "uuid",
      "name": "Ukrainian Rap",
      "description": "High-energy Ukrainian rap from my library.",
      "status": "active",
      "applePlaylistId": "p.xxxxx",
      "lastGeneratedAt": "2026-06-08T10:00:00.000Z",
      "lastExportedAt": "2026-06-08T10:05:00.000Z"
    }
  ]
}
```

### `POST /api/app/playlists`

Creates one persistent playlist.

Request:

```json
{
  "name": "Ukrainian Rap",
  "description": "High-energy Ukrainian rap from my library."
}
```

Rules:

- Requires authenticated user.
- Does not write to Apple Music.
- Creates an app playlist in `draft` state.

### `GET /api/app/playlists/:playlistId`

Returns playlist, recipe, `latestGeneration`, and `generationHistory`.

Rules:

- Returns active workspace playlists only.
- Archived playlists return `404` from the active detail API.

### `PATCH /api/app/playlists/:playlistId`

Updates playlist metadata or archives the playlist.

Rules:

- Archive user-facing playlists instead of destructive delete.
- Archived playlists cannot be reopened or mutated through this endpoint.
- Must not change Apple Music before explicit export/update.
- Rejects client updates to server-managed export fields such as
  `applePlaylistId`, `latestLibrarySyncId`, `lastGeneratedAt`, and
  `lastExportedAt`.

### `GET /api/app/playlists/:playlistId/recipe`

Returns the playlist recipe.

Rules:

- Archived playlists return `404`.

### `PUT /api/app/playlists/:playlistId/recipe`

Creates or updates the playlist recipe.

Rules:

- Validate tags and target track range with Zod.
- Recipe controls are product-style fields, not chat.

### `POST /api/app/playlists/:playlistId/generate`

Creates one playlist generation from the current recipe and latest completed library sync.

Response:

```json
{
  "recipe": {
    "id": "uuid",
    "playlistId": "uuid"
  },
  "generation": {
    "id": "uuid",
    "status": "ready_for_review",
    "tracks": []
  }
}
```

Rules:

- Requires a completed library sync.
- Does not write to Apple Music.
- Stores proposed tracks in `playlist_generation_tracks`.

### `PATCH /api/app/playlists/:playlistId/generations/:generationId/tracks`

Stores keep/remove decisions from review.

Request:

```json
{
  "markReviewed": false,
  "decisions": [
    {
      "trackId": "uuid",
      "decision": "keep"
    }
  ]
}
```

Rules:

- Track toggles can save individual keep/remove decisions while the generation
  remains `ready_for_review`.
- `markReviewed: true` is only sent by the explicit review-completion action.
- Export stays blocked until the generation is marked `reviewed`.

### `POST /api/app/playlists/:playlistId/generations/:generationId/export`

Queues explicit Apple Music export after reviewing one playlist generation.

Rules:

- Requires the generation to be marked `reviewed` after the user saves track
  keep/remove decisions.
- Requires at least one kept Apple Music library track.
- Requires explicit user action.
- Uses server-side Apple Music credentials.
- Creates a `playlist_exports` row.
- Marks the generation as `exporting`.
- Queues `playlist-generation-export` for the persistent worker.
- If the queue handoff fails after the export row is created, marks the
  generation and export row `failed` with a privacy-safe error summary and
  returns `409`.
- Does not promise exact replacement, reorder, or automatic removal in Apple Music.

Response:

```json
{
  "export": {
    "status": "queued",
    "playlistId": "uuid",
    "generationId": "uuid",
    "exportId": "uuid",
    "selectedTrackCount": 42,
    "jobId": "pg-boss-job-id"
  }
}
```

## Retry routes

### `POST /api/library-syncs/:syncId/retry`

Retries a failed library sync by creating a new queued sync for the same user.
This covers sync, normalization, and classification failures because
classification runs inside the library sync worker.

### `POST /api/sort-runs/:sortRunId/retry`

Legacy Sort write-back retry is disabled.

Rules:

- Requires authenticated user.
- Does not queue playlist creation.
- Returns `409` with platform review/export targets.
- Stale clients must reopen `/app/sorts/:sortId/review` and export approved
  tracks through `/api/app/sorts/:sortId/export`.
