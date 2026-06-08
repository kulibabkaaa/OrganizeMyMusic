# Organize Your Music

Web-first Apple Music playlist organizer that ingests a user's saved library, classifies tracks, helps them build persistent playlist recipes, previews proposed tracks, and writes confirmed playlists back to Apple Music.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth/Postgres
- `pg-boss` background jobs
- Stripe Checkout
- OpenAI structured outputs

## MVP Flow

1. Sign in with an app account.
2. Connect Apple Music in the browser with MusicKit.
3. Sync library tracks from Apple Music.
4. Normalize, dedupe, and classify tracks across language, genre, and mood.
5. Let the user build playlist recipes inside a full-library Sort.
6. Show proposed playlists and tracks for review.
7. Let the user manually confirm creation in Apple Music.
8. Persist app-created playlists for later review and regeneration.

## Local Setup

Install dependencies and run local verification:

```bash
npm install
npm run typecheck
npm run test
npm run dev
```

## Important Implementation Notes

- Apple Music auth is browser-driven and stores an encrypted user token server-side for resumable fulfillment.
- Classification uses heuristics first and OpenAI for ambiguous language plus mood labeling.
- Preview/review snapshots are immutable once confirmation or export begins.
- Payment is deferred until Apple Music organization quality is strong.
- Admin visibility is intentionally simple: queryable run state, job events, retries, and failure summaries.
