# Apple Music Integration

## MVP scope

Apple Music is the only music provider for MVP.

The app needs to:

1. Generate Apple Music developer tokens server-side.
2. Let users authorize Apple Music through MusicKit in the browser.
3. Store the user's Apple Music token encrypted.
4. Fetch the user's library songs.
5. Create playlists in the user's Apple Music account after confirmation.
6. Add approved tracks to those playlists.

## Token types

Apple Music uses two important token concepts for this product.

## Developer token

The developer token identifies the app.

Rules:

- Generated server-side.
- Uses Apple Developer Team ID, Key ID, and private key.
- Signed as an ES256 JWT.
- Private key must never reach the browser.
- Returned to browser only as a signed developer token.
- Requires an authenticated app session before the API route returns a token.

Required env vars:

```text
APPLE_TEAM_ID
APPLE_KEY_ID
APPLE_PRIVATE_KEY
```

## Music user token

The music user token identifies the user and grants access to their Apple Music library.

Rules:

- Created by browser MusicKit authorization.
- Sent to backend after user authorization.
- Encrypted before storage.
- Never logged.
- Used by backend/worker to fetch library and create playlists.

## Browser flow

```text
Dashboard loads Apple Music connection card
User clicks Connect Apple Music
Client requests /api/apple/developer-token
Client loads Apple-hosted MusicKit JS
Client configures MusicKit with the server developer token
User authorizes Apple Music
Client receives music user token
Client POSTs token to /api/apple/connect
Backend encrypts token
Backend stores connection
Dashboard shows connected state
```

`MVP-008` persists the encrypted music user token in `apple_music_connections` with token encryption version metadata.

## Server flow for developer token

```text
GET /api/apple/developer-token
  -> verify authenticated app session
  -> validate environment
  -> normalize escaped private key newlines
  -> generate ES256 JWT with Apple key
  -> return developer token and expiry
```

## API client methods

Create a server-side Apple Music API client with methods like:

```ts
class AppleMusicClient {
  getAllLibrarySongs(input: GetLibrarySongsInput): Promise<AppleLibrarySongResource[]>;
  createLibraryPlaylist(input: CreateLibraryPlaylistInput): Promise<CreateLibraryPlaylistResult>;
  addTracksToLibraryPlaylist(input: AddTracksToPlaylistInput): Promise<void>;
}
```

`MVP-009` implements this client as a server-side wrapper around Apple Music API.
It sends the developer token and encrypted-user-token-derived music user token in
request headers, follows Apple `next` pagination links for library songs,
validates response shapes, retries common transient failures such as rate limits
and server errors on idempotent reads, and raises normalized `AppleMusicApiError`
values for callers.

Playlist write-back code should create the playlist first, then add selected
tracks with `type: "library-songs"` when using synced library song IDs.

## Library sync requirements

`MVP-010` wires the user action and queue boundary: the authenticated API creates
a `library_syncs` row, writes a queue event, and sends a `library-sync` pg-boss
job. The persistent worker registers that job and marks it `syncing` when picked
up. Fetching and storing Apple Music track payloads starts in `MVP-011`.

`MVP-011` extends the worker job to load the encrypted Apple Music connection,
decrypt the music user token server-side, generate an Apple developer token,
fetch paginated library songs through `AppleMusicClient`, insert each raw Apple
resource into `library_tracks_raw.payload`, update `library_syncs.raw_track_count`,
and write success or failure `job_events`. Missing Apple credentials or Apple API
failures mark the sync `failed` with `error_summary`.

`MVP-012` normalizes the fetched Apple library song resources in the same worker
job after raw payload storage. It sanitizes title, artist, and album metadata,
uses ISRC as the strongest dedupe key when repeated, falls back to a fingerprint
of normalized title, normalized artist, and a duration bucket, upserts canonical
rows into `tracks_normalized`, links user ownership through `track_ownership`,
and updates normalized and duplicate counts on `library_syncs`.

The library sync worker should:

1. Load user's encrypted Apple Music token.
2. Decrypt token server-side.
3. Fetch all library songs with pagination.
4. Store raw payloads in `library_tracks_raw`.
5. Normalize track data.
6. Deduplicate tracks.
7. Link normalized tracks to the user.
8. Update counts and job events.

## Track fields to capture

At minimum:

- Apple library song ID.
- Name.
- Artist name.
- Album name.
- Duration in milliseconds.
- Genre names.
- Content rating.
- ISRC if present.
- Raw attributes payload.

## Playlist creation requirements

The write-back worker should:

1. Load confirmed sort run.
2. Load selected generated playlists.
3. Load non-removed tracks.
4. Decrypt Apple Music user token.
5. Create each playlist in Apple Music.
6. Store returned Apple playlist ID.
7. Add tracks to each created playlist.
8. Emit job events.
9. Mark run completed or failed.

`MVP-021` registers the `playlist-create` worker job. It loads a confirmed
`creating_playlists` sort run, decrypts the Apple Music user token server-side,
creates only the selected playlist shells in Apple Music, stores each returned
`sort_playlists.apple_playlist_id`, skips playlists that already have an Apple
playlist ID during retries, and records partial failures in `job_events`.

`MVP-022` extends the same worker to load non-removed tracks for each selected
playlist, add Apple library song IDs to created playlists in batches, emit
per-playlist progress events, and mark the sort run `completed` after all
playlist track insertion succeeds.

`MVP-023` adds retry routes for failed library syncs and failed playlist
write-back. Library sync retry creates a new queued sync so partial raw imports
are not mixed with the retry. Playlist write-back retry requeues the confirmed
sort run, returns it to `creating_playlists`, and relies on stored
`sort_playlists.apple_playlist_id` values to avoid duplicate playlist creation.

## Idempotency

Playlist creation must avoid duplicates during retry.

Recommended approach:

- If `sort_playlists.apple_playlist_id` already exists, do not create a new playlist.
- If playlist exists but track insertion failed, retry adding tracks.
- Store job events for each playlist.
- Consider storing a per-playlist write status later.

## Error cases

Handle:

- Missing Apple Music connection.
- Expired or invalid music user token.
- Apple API rate limit.
- Apple API pagination failure.
- Track unavailable for playlist insertion.
- Playlist creation succeeds but adding tracks fails.
- User revokes Apple Music access.

## What not to do

- Do not write playlists before confirmation.
- Do not modify or delete existing Apple Music playlists in MVP.
- Do not try to sync Spotify or YouTube Music in MVP.
- Do not expose Apple private key in client bundle.
- Do not log user token.
