# Production Smoke Test

## Purpose

Use this checklist to verify the full Apple Music platform flow before a real
user test or production release. It is written for a tester who does not know
the codebase.

The test account's Apple Music library is private data. Do not paste raw track
payloads, Apple Music user tokens, developer tokens, private keys, or
track-level debug dumps into tickets, chat, logs, or screenshots.

## Scope

This smoke covers:

- Signup or sign in.
- Apple Music connect.
- Library sync.
- Draft Sort creation.
- Preview generation.
- Checkout or approved development bypass.
- Full Sort processing.
- Review.
- Explicit export to Apple Music.
- Rollback/reset notes.

Out of scope:

- Spotify and YouTube Music.
- Native app flows.
- Automatic edits to existing Apple Music playlists.
- Real payment implementation while payment remains blocked.

## Hard Stop Conditions

Stop the smoke immediately when any condition is true:

- The app shows or logs a raw Apple Music user token.
- The app exposes `APPLE_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `OPENAI_API_KEY`, `ENCRYPTION_KEY`, `STRIPE_SECRET_KEY`, or a raw Apple Music
  user token.
- Any Apple Music write-back is possible before review plus explicit export
  confirmation.
- The tester is signed into the wrong Apple Music account.
- The worker is offline, repeatedly crashing, or not processing `pg-boss` jobs.
- Checkout requires real payment while payment remains blocked.
- A reset or rollback step would delete or edit Apple Music library content.

## Preflight

Run these checks before opening the app:

- Local required checks pass:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- Vercel or the target host is deployed from the intended commit.
- The persistent worker is deployed from the same intended commit.
- Supabase migrations are applied.
- Supabase has the `pgboss` schema initialized.
- The worker process is running outside Vercel serverless.
- `NEXT_PUBLIC_APP_URL` matches the target URL.
- Apple Music developer credentials are present in the web app and worker
  environments.
- `ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and
  `DATABASE_URL` are present only in server/worker environments.
- `PAYMENTS_ENABLED` is unset or false unless payment implementation has been
  explicitly reopened.
- `PAYMENTS_DEV_BYPASS_ENABLED` is unset or false by default.
- If a local development bypass was explicitly approved for this smoke, set
  `PAYMENTS_DEV_BYPASS_ENABLED=true` only in the local/test environment and
  record that approval in the smoke notes.

## Test Account Setup

- Use a dedicated Apple Music test account, not a shared personal account.
- Confirm the account has enough saved songs to exercise sorting quality. The
  target is at least 500 saved songs; record the real count if lower.
- Confirm the account can create new Apple Music playlists.
- Create or identify a dedicated app account email for the smoke.
- Keep the app account email available for rollback via `/admin/reset-user`.

## Smoke Checklist

Use the `Result` column as: `Pass`, `Fail`, `Blocked`, or `Skipped`.

| Step | Action | Expected result | Result | Notes |
| --- | --- | --- | --- | --- |
| 1 | Open the target app URL. | Landing page loads. Primary CTA goes to `/auth` for signed-out users. |  |  |
| 2 | Sign up or sign in with the dedicated app account. | Auth completes and routes to `/app` or legacy `/dashboard` redirecting into the app. |  |  |
| 3 | Open `/app`. | Dashboard renders without private debug data. |  |  |
| 4 | Connect Apple Music. | MusicKit authorization opens in the browser and returns to the app. |  |  |
| 5 | Confirm connection state. | The app shows Apple Music connected. No raw token appears in browser UI, logs, or network response bodies. |  |  |
| 6 | Start library sync. | Sync queues as background work. User can navigate away. |  |  |
| 7 | Watch sync status. | Dashboard or Library page shows queued/running/completed state with latest counts. |  |  |
| 8 | Verify worker processing. | Worker logs show safe event types/counts. No raw library payloads or tokens appear. |  |  |
| 9 | Confirm sync completion. | Raw, normalized, duplicate, and classification counts are visible or queryable. Record counts. |  |  |
| 10 | Open `/app/sorts/new`. | New Sort creation starts without payment or export side effects. |  |  |
| 11 | Create a draft Sort. | Sort draft is saved and reachable from `/app/sorts`. |  |  |
| 12 | Add at least three playlist plans. | Plans have clear names, supported tags, target sizes, and validation feedback. |  |  |
| 13 | Generate preview. | Preview uses existing library tracks only and does not create Apple Music playlists. |  |  |
| 14 | Inspect preview quality. | Playlist names, counts, warnings, and sample tracks are understandable. Low/empty matches show warnings. |  |  |
| 15 | Continue to checkout. | If payments are disabled, checkout clearly says payment is paused/unavailable. |  |  |
| 16 | If approved, use development bypass. | Only explicit `PAYMENTS_DEV_BYPASS_ENABLED=true` enables the bypass. CTA labels it as a dev bypass. |  |  |
| 17 | Verify full Sort processing. | A `full-sort` pg-boss job runs and the processing page updates without manual refresh. |  |  |
| 18 | Open review. | Generated playlists are editable before export. User can remove/undo tracks or playlists. |  |  |
| 19 | Confirm no automatic write-back. | Existing Apple Music playlists remain untouched before export confirmation. |  |  |
| 20 | Select playlists for export. | Export CTA is disabled until at least one playlist with tracks is selected. |  |  |
| 21 | Open export confirmation. | Modal states new playlists will be created and existing Apple Music playlists will not be modified. |  |  |
| 22 | Explicitly confirm export. | App queues playlist creation only after confirmation. |  |  |
| 23 | Watch export processing. | Exporting page polls status and shows progress. Worker processes `playlist-create`. |  |  |
| 24 | Confirm complete state. | Complete page lists created playlists and any partial failures. |  |  |
| 25 | Open Apple Music. | New playlists appear in the test Apple Music account with expected tracks. |  |  |
| 26 | Retry if partial failure occurred. | Retry is visible only for failed/retryable app jobs and does not modify existing Apple Music playlists. |  |  |
| 27 | Review admin diagnostics. | `/admin/sort-runs` and run inspection show stages, counts, failure categories if any, and no private payloads. |  |  |

## Expected Results Summary

The smoke passes only when:

- Signup/sign-in works.
- Apple Music connect works.
- Library sync completes through the persistent worker.
- Draft creation and autosave work.
- Preview is generated before checkout.
- Payment is either clearly blocked or an explicitly approved development
  bypass is used.
- Full Sort processing completes.
- Review is available before export.
- Export requires explicit confirmation.
- Apple Music receives only newly created playlists.
- Existing Apple Music playlists are not edited or deleted.
- Admin/job visibility is diagnostic without exposing private music data.

## Payment Notes

Payment implementation is blocked until explicitly reopened.

For production-like smoke:

- Leave `PAYMENTS_ENABLED` false or unset.
- Verify checkout explains payment is unavailable.
- Do not enter real card details.

For local or test-environment smoke with approved bypass:

- Set `PAYMENTS_DEV_BYPASS_ENABLED=true` only for that environment.
- Verify the UI labels the action as a development bypass.
- Unset `PAYMENTS_DEV_BYPASS_ENABLED` after the smoke.
- Never enable a development bypass by default or in production.

## Rollback And Reset

Use the least destructive reset that clears the app state:

1. If no export was confirmed, use `/admin/reset-user` to preview and reset the
   dedicated app account by email. Confirm row counts before typing the reset
   phrase.
2. Confirm `/admin/reset-user` removes pg-boss jobs before deleting the
   Supabase auth user.
3. If export was confirmed, delete only the newly created Apple Music playlists
   manually from the test Apple Music account. The app must not automatically
   delete or edit Apple Music playlists.
4. Do not run manual SQL unless the admin reset tool is unavailable and an
   engineer has reviewed the exact SQL.
5. Record the reset result and any remaining Apple Music playlists in the smoke
   notes.

## Evidence To Record

Record these items in the smoke notes:

- Target URL and commit/deployment identifier.
- Test app account email.
- Whether payment was blocked or an approved development bypass was used.
- Library raw, normalized, duplicate, and classification counts.
- Sort id.
- Preview playlist count and warning summary.
- Full Sort job result.
- Export job result.
- Created Apple Music playlist names and track counts.
- Any failure category shown in admin diagnostics.
- Rollback/reset action taken.

Do not record raw tokens, private keys, raw Apple Music payloads, or full
track-level library exports.

## Historical Notes

The 2026-05-23 MVP smoke completed with a real Apple Music account and explicit
user confirmation before write-back. It created two Apple Music playlists. The
test account had 377 raw tracks, so the 500-track scale target remained
unverified.

The 2026-05-26 platform route smoke partially unblocked `/app`, Apple Music
sign-in, and sync, but checkout, processing, review, and export were not fully
executed through the platform UI because the target account had no paid Sort.
