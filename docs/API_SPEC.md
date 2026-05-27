# API Spec

## Principles

- API routes must validate input with Zod where practical.
- API routes must use authenticated user context.
- API routes must not expose secrets.
- API routes should be thin and call server modules.
- Long-running work should be queued, not done inside request-response routes.

## Planned routes

## Platform route migration

Current MVP routes such as `/login`, `/dashboard`, `/sorts/[id]`, and
`/api/sort-runs` stay valid during migration.

Target platform routes live under `/auth` and `/app`. New API routes for Sorts,
Playlist Recipes, preview, checkout, review, and export should prefer
`/api/app/...` while existing endpoints remain as compatibility aliases until
callers are moved.

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
  "lastValidatedAt": "2026-01-01T00:00:00.000Z"
}
```

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

### `POST /api/app/sorts`

Creates a platform Sort draft. This endpoint is used by the new `/app` flow and
does not generate a preview.

Request:

```json
{
  "name": "Road trip cleanup",
  "librarySyncId": "uuid-or-null",
  "sourceProvider": "apple_music"
}
```

Rules:

- Requires authenticated user.
- Uses only `apple_music` as `sourceProvider` for the MVP.
- Allows `librarySyncId` to be omitted or to reference a running sync.
- Returns preview readiness separately so the builder can disable `Preview Sort`
  until the sync is completed.
- Does not write to Apple Music.

### `GET /api/app/sorts/:sortId`

Returns Sort draft metadata, Playlist Recipes, and preview readiness for the
authenticated owner.

### `PATCH /api/app/sorts/:sortId`

Updates Sort draft metadata such as name or linked library sync.

### `/api/app/sorts/:sortId/recipes`

Creates, lists, and reorders structured Playlist Recipes for a Sort draft.

### `/api/app/sorts/:sortId/recipes/:recipeId`

Updates or deletes a single Playlist Recipe. Recipe payloads are validated with
the shared Playlist Recipe Zod schemas.

### `POST /api/app/sorts/:sortId/preview`

Generates or returns the platform lightweight preview for a Sort draft.

Response:

```json
{
  "status": "created",
  "previewSnapshot": {
    "sortRunId": "uuid",
    "librarySyncId": "uuid",
    "generatedAt": "2026-05-26T12:00:00.000Z",
    "playlists": [
      {
        "id": "preview_recipe_1",
        "recipeId": "recipe_1",
        "playlistName": "Sad Ukrainian rap",
        "tags": [],
        "estimatedTrackCount": 32,
        "confidenceLabel": "high",
        "fitLabel": "strong",
        "sampleTracks": [],
        "lockedTrackCount": 22
      }
    ]
  }
}
```

Rules:

- Requires authenticated user.
- Requires the Sort to belong to the current user.
- Requires a completed Apple Music library sync.
- Requires at least one Playlist Recipe.
- Stores only the lightweight preview snapshot on `sort_runs.preview_snapshot`.
- Does not insert generated review playlists or playlist-track assignments.
- Does not queue jobs or write to Apple Music.
- Does not regenerate once payment or confirmation has started.

### `POST /api/sort-runs`

Creates a draft sort run and stores parsed playlist requests.

Compatibility note: the platform UI will introduce Playlist Recipes under
`/api/app/sorts/:sortId/recipes`. Until that migration is complete, this
endpoint remains the compatibility path for textarea playlist requests.

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

### `POST /api/app/sorts/:sortId/checkout`

Starts checkout for a specific Sort.

Rules:

- Requires authenticated user.
- If `PAYMENTS_ENABLED` is false and `PAYMENTS_DEV_BYPASS_ENABLED` is false,
  returns `409` and does not mark payment paid.
- With the explicitly approved local dev bypass, marks the Sort paid and queues
  the `full-sort` worker job.
- With real Stripe enabled, creates a Stripe Checkout session.
- Does not export to Apple Music.

Dev-bypass response:

```json
{
  "status": "paid",
  "mode": "dev_bypass",
  "processingUrl": "/app/sorts/uuid/processing",
  "fullSort": {
    "status": "queued",
    "jobId": "pgboss-job-id"
  }
}
```

### `full-sort` worker job

Runs after payment confirmation.

Rules:

- Requires `sort_runs.state = paid` and `payment_status = paid`.
- Requires at least one Playlist Recipe and a library sync.
- Reads normalized tracks and classifications.
- Generates full editable playlists from Playlist Recipes.
- Stores generated playlists in `sort_playlists`.
- Stores generated track assignments in `sort_playlist_tracks`.
- Stores low-match diagnostics in `sort_playlists.playlist_rules`.
- Records progress/failure in `job_events`.
- Does not call Apple Music APIs.

### `POST /api/app/sorts/:sortId/export`

Exports reviewed playlists to Apple Music.

Request:

```json
{
  "selectedPlaylistIds": ["preview-playlist-id-1", "preview-playlist-id-2"],
  "removedTrackFingerprintsByPlaylistId": {
    "preview-playlist-id-1": ["track-fingerprint"]
  },
  "renamedPlaylistTitlesById": {
    "preview-playlist-id-1": "Late night edits"
  }
}
```

Response:

```json
{
  "status": "exporting",
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
- Must not export runs owned by another user.
- Persists selected playlists in `sort_playlists.selected`.
- Persists reviewed playlist titles in `sort_playlists.title`.
- Persists removed tracks in `sort_playlist_tracks.removed_by_user`.
- Queues `playlist-create` for the persistent worker.
- Existing `/api/sort-runs/:sortRunId/confirm` no longer queues write-back;
  platform callers must use this export endpoint.

## Job events

## Export pages

### `GET /app/sorts/:sortId/exporting`

Shows refreshable Apple Music export progress for reviewed playlists.

### `GET /app/sorts/:sortId/complete`

Shows the final exported playlist names, track counts, export timestamp, and
Apple Music playlist links when an Apple URL can be derived.

### `GET /api/sort-runs/:sortRunId/events`

Returns job events for a sort run.

Response:

```json
{
  "events": [
    {
      "stage": "classification",
      "level": "info",
      "message": "Classified 500 tracks.",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
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
