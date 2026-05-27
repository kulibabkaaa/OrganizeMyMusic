# Organize Your Music

Web-first Apple Music playlist organizer that ingests a user's saved library, classifies tracks, previews curated playlist Sorts, and writes reviewed playlists back to Apple Music after explicit export confirmation.

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
5. Create a Sort with playlist requests or structured Playlist Recipes.
6. Show a lightweight preview before payment.
7. Unlock the Sort with a one-time payment when payment is enabled.
8. Let the user review generated playlists.
9. Export reviewed playlists to Apple Music only after explicit confirmation.

## Platform UI Direction

The current working Apple Music MVP is moving toward a dashboard-based product:

```text
Landing page -> /auth -> /app -> Sorts -> Preview -> Checkout -> Review -> Export
```

The public landing page should stay visually intact. New app work should follow
`docs/UI_PLATFORM_FLOW_ROADMAP.md`.

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
- Preview snapshots are immutable once checkout, payment, or export review begins.
- Admin visibility is intentionally simple: queryable run state, job events, retries, and failure summaries.
