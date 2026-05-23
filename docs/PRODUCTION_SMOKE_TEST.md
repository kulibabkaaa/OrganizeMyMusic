# Production Smoke Test

## Purpose

`MVP-026` verifies the real Apple Music flow once, end to end.

Do not run this test with a shared Apple Music account. The app reads private
library data and creates real playlists only after explicit confirmation.

## Required preflight

- Local checks pass:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- Vercel Production runs the current MVP build.
- Vercel Production and Railway use the same current Supabase `DATABASE_URL`.
- Railway worker is online and running `npm run worker`.
- Supabase has the `pgboss` schema initialized.
- Apple Music credentials are configured in Vercel and Railway.
- `NEXT_PUBLIC_APP_URL` matches the URL being tested.

## Smoke path

1. Open the Production app URL.
2. Create a new app account or sign in.
3. Confirm the dashboard shows the signed-in state.
4. Connect Apple Music with MusicKit.
5. Confirm the dashboard shows Apple Music connected.
6. Start library sync.
7. Wait for sync completion.
8. Confirm at least 500 raw library tracks are stored when the account has at
   least 500 saved songs.
9. Confirm normalized and duplicate counts are shown.
10. Request at least three playlists, for example:
    - Ukrainian rap
    - gym rap
    - sad Slavic songs
11. Generate the preview.
12. Inspect playlist names, descriptions, track counts, and included tracks.
13. Deselect or remove anything that should not be created.
14. Confirm only when the preview is acceptable.
15. Verify the app queues playlist creation.
16. Verify the Railway worker completes the job.
17. Verify the playlists appear in the real Apple Music account.
18. Record any partial failures and retry behavior.

## Stop conditions

Stop before confirmation when:

- The preview is empty or clearly wrong.
- The app shows the wrong Apple Music account.
- Playlist counts do not match the confirmation screen.
- Any write-back action is available before explicit confirmation.
- Railway worker is offline or crashing.
- Vercel API routes cannot reach Supabase.
- Apple Music authorization fails or returns a stale token.

## Current status

As of 2026-05-23:

- Railway worker is online.
- Supabase MCP confirms `pgboss` tables exist.
- Current MVP worktree has been deployed to Vercel Production and is available
  through `https://organize-my-music.vercel.app`.
- Production alias `https://organize-my-music.vercel.app` responds publicly.
- Safe smoke checks for `/`, `/dashboard`, and `/login` returned `200`.
- Vercel Production `DATABASE_URL` was validated indirectly through an
  authenticated production sync request.
- A full smoke test was run with a real Apple Music account and explicit user
  confirmation before write-back.

Smoke result:

- App account sign-in worked.
- MusicKit Apple Music authorization worked.
- The Apple Music user token was persisted server-side and connection status
  appeared on the dashboard.
- Library sync `9d30ecd1-d786-4aff-aec3-4c839e858a1f` completed with 377 raw
  tracks, 359 normalized tracks, and 18 duplicates.
- Playlist requests were saved for Ukrainian rap, gym rap, and sad Slavic
  songs.
- Sort run `4fede120-bc0e-4d9b-861b-477cc236a2e5` reached `preview_ready`,
  then explicit user confirmation queued write-back.
- Railway processed the playlist creation job and Supabase recorded the sort
  run as `completed`.
- Apple Music write-back created two playlists and added three tracks.
- The user verified the two playlists appeared in the Apple Music app.

Known issues from this smoke:

- The test account had 377 raw tracks, so the 500-track scale target remains
  unverified.
- Sorting quality is weak in the first real run: output playlists were very
  small, and one requested playlist had no tracks.
- Empty or low-match playlists need stronger preview warnings before the user
  confirms write-back.
- Stripe remains deferred.
