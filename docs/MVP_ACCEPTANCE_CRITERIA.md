# MVP Acceptance Criteria

## MVP done means end-to-end Apple Music success

The MVP is done only when a real user can complete the full flow:

1. Create or access an app account.
2. Connect Apple Music.
3. Sync their Apple Music saved library.
4. Request custom playlists.
5. See a preview.
6. Confirm the output.
7. See playlists appear in their Apple Music account.

## Required user flow

### 1. Account

- User can sign up or sign in.
- User has a profile row.
- User can access `/dashboard`.
- Signed-out users cannot access private user data.

### 2. Apple Music connection

- User can authorize Apple Music through MusicKit.
- Backend generates Apple developer token server-side.
- Backend stores encrypted Apple Music user token.
- Dashboard shows connection status.

### 3. Library sync

- User can start sync.
- App fetches Apple Music saved library songs.
- App stores raw payloads.
- App normalizes tracks.
- App deduplicates tracks.
- App links tracks to user ownership.
- Dashboard shows counts and status.

### 4. Classification

- App classifies tracks using metadata and heuristics first.
- App uses OpenAI only where useful.
- App stores classification source, confidence, version, and metadata hash.
- Ukrainian, Russian, mixed-language, instrumental, and unknown tracks are supported.

### 5. Playlist request and planning

- User can request playlists in natural language.
- App converts requests into playlist rules.
- App matches existing tracks to rules.
- App produces playlist titles, descriptions, track lists, and confidence/reasons.
- App handles empty or low-confidence playlists gracefully.

### 6. Preview

- User can inspect playlist output before anything is written to Apple Music.
- User can deselect playlists.
- User can remove tracks if implemented.
- Preview snapshot is stable after confirmation/payment state begins.

### 7. Confirmation

- App requires explicit confirmation.
- App clearly states how many playlists and tracks will be created.
- No Apple Music writes happen before confirmation.

### 8. Apple Music write-back

- App creates confirmed playlists in Apple Music.
- App adds confirmed tracks to each playlist.
- App stores Apple playlist IDs.
- App shows completion status.
- App records partial failures.

### 9. Safety

- Raw Apple Music user token is never stored.
- Raw Apple Music user token is never logged.
- Apple private key is never exposed to browser code.
- Users cannot access other users' music data.
- Failed jobs can be retried without duplicating already created playlists.

## MVP is not done if

- The dashboard is only mocked.
- Apple Music connect is not real.
- Tracks are not fetched from Apple Music.
- AI produces output but nothing is written back to Apple Music.
- Playlists are written without confirmation.
- User token is stored unencrypted.
- RLS policies are missing.
- Deployment cannot run the background worker.
