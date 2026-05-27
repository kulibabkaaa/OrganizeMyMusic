# Architecture

## High-level shape

OrganizeMyMusic should remain a single web app plus a worker for the MVP.

```text
Browser
  |
  | Next.js App Router UI
  |
Next.js server routes
  |
  |-------------------- Supabase Auth
  |-------------------- Supabase Postgres
  |-------------------- Apple Music API
  |-------------------- OpenAI API
  |-------------------- Stripe API later
  |
pg-boss worker
  |
  |-------------------- Apple Music sync
  |-------------------- Track normalization
  |-------------------- Track classification
  |-------------------- Playlist planning
  |-------------------- Apple Music playlist creation
```

## Components

### Web app

Responsibilities:

- Landing page.
- Platform dashboard (`/app`) with `/dashboard` kept as a legacy redirect or alias during migration.
- Auth UI.
- Apple Music connect UI.
- Library sync controls.
- Sort and Playlist Recipe UI.
- Preview/paywall UI.
- Review and export UI.
- Status and error UI.

### API routes

Responsibilities:

- Auth-aware mutations.
- Apple developer token endpoint.
- Apple connection endpoint.
- Sync start endpoint.
- Sort-run creation endpoint.
- Preview endpoint.
- Review/export confirmation endpoint.
- Status endpoints.

API routes should be thin. Domain logic should live in reusable server modules.

### Worker

Responsibilities:

- Long-running Apple Music library sync.
- Normalization and dedupe.
- Classification.
- Playlist planning if queued.
- Apple Music write-back.
- Retryable job processing.
- Job event logging.

The worker should run as a separate persistent process. Do not rely on Vercel serverless functions for persistent `pg-boss` job processing.

### Database

Supabase Postgres stores:

- Profiles.
- Apple Music connection records.
- Raw Apple Music payloads.
- Normalized track records.
- User track ownership.
- Classifications.
- Playlist requests and, after the platform UI migration, structured Playlist Recipes.
- Sort runs.
- Generated playlists.
- Playlist-track relationships.
- Payments later.
- Job events.

### AI

OpenAI should be used for:

- Ambiguous classification.
- Playlist request parsing when deterministic parsing is not enough.
- Playlist title/description generation.
- Playlist planning where multi-dimensional reasoning is required.

OpenAI should not be used for:

- Direct Apple Music write-back.
- Auth decisions.
- Payment decisions.
- Secret handling.
- Raw database mutation without app validation.

## Data flow

### Connect Apple Music

```text
User clicks Connect Apple Music
Browser requests developer token from backend
Backend generates developer token
Browser configures MusicKit
User authorizes Apple Music
Browser receives music user token
Browser sends token to backend
Backend encrypts token
Backend stores encrypted token
Dashboard shows connected state
```

### Sync library

```text
User clicks Sync Library
API creates library_sync row
API queues pg-boss job
Worker decrypts Apple user token
Worker fetches Apple Music library songs
Worker stores raw payloads
Worker normalizes tracks
Worker dedupes tracks
Worker creates user ownership links
Worker updates sync status
Dashboard polls or refreshes status
```

### Preview a Sort

```text
User creates a Sort
User adds playlist requests or Playlist Recipes
API creates sort_run and playlist request/recipe rows
Worker classifies tracks if needed
Worker parses request into rules
Worker plans playlists from classifications
Worker stores preview snapshot
App shows preview
```

### Review and export to Apple Music

```text
User reviews generated playlists
User confirms export of selected playlists
API queues playlist creation job
Worker decrypts Apple user token
Worker creates Apple Music playlists
Worker adds selected tracks
Worker stores Apple playlist IDs
Worker marks run completed
Dashboard shows complete state
```

## Provider abstraction

Apple Music is the only MVP provider. Still, the code should avoid hard-coding every concept as Apple-only.

Recommended internal shape:

```ts
interface MusicProviderClient {
  getLibraryTracks(): Promise<ProviderTrack[]>;
  createPlaylist(input: CreatePlaylistInput): Promise<ProviderPlaylist>;
  addTracksToPlaylist(input: AddTracksInput): Promise<void>;
}
```

For MVP, implement only:

```text
AppleMusicProviderClient
```

Do not build Spotify or YouTube implementations yet.

## Error handling

Use normalized errors:

```ts
type AppError = {
  code: string;
  message: string;
  details?: unknown;
};
```

Examples:

- `APPLE_TOKEN_EXPIRED`
- `APPLE_RATE_LIMITED`
- `APPLE_LIBRARY_SYNC_FAILED`
- `OPENAI_CLASSIFICATION_FAILED`
- `PLAYLIST_CREATE_FAILED`
- `DATABASE_WRITE_FAILED`

## State model

Important states:

```text
draft
syncing
classifying
preview_ready
awaiting_payment
paid
creating_playlists
completed
failed
```

Payment state may remain unused until the core MVP flow works.

## Platform UI routing target

The product is moving to the route model in
`docs/UI_PLATFORM_FLOW_ROADMAP.md`:

```text
/auth
/app
/app/sorts
/app/sorts/[sortId]/builder
/app/sorts/[sortId]/preview
/app/sorts/[sortId]/checkout
/app/sorts/[sortId]/processing
/app/sorts/[sortId]/review
/app/sorts/[sortId]/exporting
/app/sorts/[sortId]/complete
```

Do not rename database states just to match UI labels. Use an adapter such as
`getSortUiStatus()` so existing backend state remains stable while the product
language changes.
