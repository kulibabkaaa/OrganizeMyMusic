# Organize Your Music

Web-first Apple Music playlist organizer that ingests a user's saved library, classifies tracks, previews a curated playlist bundle, and writes playlists back to Apple Music after payment and confirmation.

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
5. Show a preview of generated playlists.
6. Charge a one-time Stripe payment.
7. Let the user manually confirm creation in Apple Music.

## Local Setup

The current machine does not have Node installed, so dependency installation and runtime verification were not run here.

Once Node is available:

```bash
npm install
npm run typecheck
npm run test
npm run dev
```

## Important Implementation Notes

- Apple Music auth is browser-driven and stores an encrypted user token server-side for resumable fulfillment.
- Classification uses heuristics first and OpenAI for ambiguous language plus mood labeling.
- Preview snapshots are immutable once a checkout session is created.
- Admin visibility is intentionally simple: queryable run state, job events, retries, and failure summaries.

