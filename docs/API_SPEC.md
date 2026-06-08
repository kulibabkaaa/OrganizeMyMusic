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

### `POST /api/app/sorts/:sortId/checkout`

Starts checkout or dev-bypass processing for a Sort.

Rules:

- Requires authenticated user.
- Queues `full-sort` when checkout/dev-bypass unlocks processing.
- Does not write to Apple Music.

### `POST /api/app/sorts/:sortId/export`

Queues reviewed Sort playlist export to Apple Music.

Rules:

- Requires authenticated user.
- Requires explicit user action.
- Persists selected playlists and removed tracks.
- Queues `playlist-create` for the persistent worker.
- Does not promise exact replacement, reorder, or automatic removal in Apple Music.

### `POST /api/sort-runs`

Creates a draft sort run and stores parsed playlist requests.

Request:

```json
{
  "librarySyncId": "uuid",
  "playlistRequests": [
    "Ukrainian rap",
    "Gym rap",
    "Sad Slavic songs"
  ]
}
```

Response:

```json
{
  "sortRunId": "uuid",
  "state": "preview_ready",
  "playlistRequests": [
    {
      "id": "uuid",
      "userPrompt": "Ukrainian rap",
      "parsedRules": {
        "title": "Ukrainian Rap",
        "languages": ["ukrainian"],
        "genres": ["Hip-Hop/Rap"],
        "subgenres": ["rap"],
        "moods": [],
        "energyMin": null,
        "energyMax": null,
        "excludeExplicit": false,
        "source": "heuristic"
      }
    }
  ],
  "previewSnapshot": {
    "sortRunId": "uuid",
    "librarySyncId": "uuid",
    "generatedAt": "2026-01-01T00:00:00.000Z",
    "playlists": []
  }
}
```

Rules:

- Requires authenticated user.
- Requires at least three playlist request strings.
- Requires a completed user-owned library sync.
- Stores original prompts in `playlist_requests.user_prompt`.
- Stores deterministic parsed rules in `playlist_requests.parsed_rules`.
- Generates and stores a stable preview snapshot.
- Stores generated playlists in `sort_playlists`.
- Stores playlist-track assignments, score, and reason in `sort_playlist_tracks`.
- Does not write to Apple Music in this step.

### `POST /api/sort-runs/:sortRunId/checkout`

Legacy endpoint. Returns `409`.

Rules:

- Does not unlock full Sort processing.
- Does not mark a Sort paid.
- New app surfaces must use `POST /api/app/sorts/:sortId/checkout`.

### `GET /api/sort-runs/:sortRunId`

Returns sort run status.

Response includes:

```json
{
  "sortRunId": "uuid",
  "state": "preview_ready",
  "paymentStatus": "pending",
  "previewSnapshot": {
    "playlists": []
  },
  "playlistRequests": []
}
```

### `GET /api/sort-runs/:sortRunId/preview`

Returns preview snapshot.

Response:

```json
{
  "sortRunId": "uuid",
  "state": "preview_ready",
  "playlists": [
    {
      "id": "uuid",
      "title": "Ukrainian Rap",
      "description": "Ukrainian-language rap and hip-hop from your library.",
      "trackCount": 32,
      "tracks": [
        {
          "id": "uuid",
          "appleSongId": "i.xxxxx",
          "name": "Track name",
          "artistName": "Artist",
          "score": 0.91,
          "reason": "Ukrainian language and rap genre classification."
        }
      ]
    }
  ]
}
```

### `POST /api/sort-runs/:sortRunId/confirm`

Confirms selected playlists and queues Apple Music write-back.

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
  "sortRunId": "uuid",
  "state": "creating_playlists",
  "selectedPlaylistCount": 2,
  "selectedTrackCount": 42,
  "jobId": "pg-boss-job-id"
}
```

Rules:

- Must require explicit user action.
- Must not run on page load.
- Must not confirm runs owned by another user.
- Persists selected playlists in `sort_playlists.selected`.
- Persists removed tracks in `sort_playlist_tracks.removed_by_user`.
- Queues `playlist-create` for the persistent worker.

## Job events

### `GET /api/sort-runs/:sortRunId/events`

Returns job events for a sort run.

## New Music

### `POST /api/app/new-music/process`

Processes tracks that exist in the latest completed sync but not the previous
completed sync.

Rules:

- Requires authenticated user.
- Requires two completed library syncs.
- Uses saved app playlist recipes.
- Returns review-only recommendations.
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

Retries failed Apple Music write-back for a confirmed sort run. The route only
accepts failed sort runs, sets the run back to `creating_playlists`, and queues
the playlist creation worker.

Rules:

- Retry must be idempotent.
- Do not create duplicate Apple Music playlists if some already exist.
- Existing `sort_playlists.apple_playlist_id` values are reused on retry.
- Apple Music writes remain worker-only and require prior explicit confirmation.
