# Production Smoke Test

## Purpose

This runbook verifies the platform-first Apple Music MVP once, end to end.

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
- Supabase migration history includes `platform_playlists` and
  `fix_playlists_updated_at_default`.
- Supabase has platform tables `playlists`, `playlist_generations`,
  `playlist_generation_tracks`, and `playlist_exports` with RLS enabled.
- `playlist_recipes_scope_check` is validated and `playlists.updated_at` is
  not nullable with a `now()` default.
- `npm run platform:check` passes in the deployment environment.
- Apple Music credentials are configured in Vercel and Railway.
- `NEXT_PUBLIC_APP_URL` matches the URL being tested.

## Smoke path

1. Open the Production app URL.
2. Signup or sign in.
3. Confirm the dashboard shows the signed-in state.
4. Apple Music connect with MusicKit.
5. Confirm the dashboard shows Apple Music connected.
6. Library sync.
7. Wait for sync completion.
8. Click `Organize My Library`.
9. Create a full-library Sort with at least three playlist recipes.
10. Confirm the Sort Builder shows playlist plans on the left and the selected
    recipe editor on the right.
11. Confirm the Sort preview/generation action remains blocked until library
    sync is completed.
12. Confirm at least 500 raw library tracks are stored when the account has at
    least 500 saved songs.
13. Confirm normalized and duplicate counts are shown.
14. Preview generation.
15. Use at least three playlist recipes, for example:
    - Ukrainian rap
    - gym rap
    - sad Slavic songs
16. Checkout or approved development bypass.
17. Full Sort processing.
18. Review playlist names, descriptions, track counts, and included tracks.
19. Deselect playlists or remove tracks that should not be created.
20. Explicit export to Apple Music only when the review is acceptable.
21. Verify the app queues playlist creation.
22. Verify the Railway worker completes the job.
23. Verify the playlists appear in the real Apple Music account.
24. Verify exported app-created playlists appear in `/app/playlists`.
25. Open one exported playlist in `/app/playlists/:playlistId`.
26. Confirm the playlist shows recipe details, latest generated tracks, export
    status, and generation history.
27. Create one new playlist from `/app/playlists/new` without starting a Sort.
28. Save its playlist-owned recipe.
29. Generate proposed tracks from the latest synced Apple Music library.
30. Review every proposed track, remove or restore at least one track, click
    `Mark Review Complete`, then queue `Create Apple Music playlist`.
31. Verify the individual playlist export is processed by the persistent worker
    and the app playlist receives an Apple playlist ID.
32. Run a second library sync after adding at least one song to Apple Music.
33. Click `Process New Music` from the library page.
34. Confirm recommendations are review-only and based on saved playlist recipes.
35. Record any partial failures and retry behavior.

## Legacy Sort-first smoke path

The old smoke path is retained only as historical context. Do not use it as the
platform-first completion gate.

1. Open the Production app URL.
2. Signup or sign in.
3. Confirm the dashboard shows the signed-in state.
4. Apple Music connect with MusicKit.
5. Confirm the dashboard shows Apple Music connected.
6. Library sync.
7. Wait for sync completion.
8. Draft Sort creation with playlist requests.
9. Confirm at least 500 raw library tracks are stored when the account has at
   least 500 saved songs.
10. Confirm normalized and duplicate counts are shown.
11. Preview generation.
12. Request at least three playlists, for example:
    - Ukrainian rap
    - gym rap
    - sad Slavic songs
13. Checkout or approved development bypass.
14. Full Sort processing.
15. Review playlist names, descriptions, track counts, and included tracks.
16. Deselect or remove anything that should not be created.
17. Explicit export to Apple Music only when the review is acceptable.
18. Verify the app queues playlist creation.
19. Verify the Railway worker completes the job.
20. Verify the playlists appear in the real Apple Music account.
21. Record any partial failures and retry behavior.

## Stop conditions

Stop before confirmation when:

- The preview is empty or clearly wrong.
- The app shows the wrong Apple Music account.
- Playlist counts do not match the confirmation screen.
- Any write-back action is available before explicit confirmation.
- Any Apple Music write-back is possible before review and explicit export
  confirmation.
- Any product copy promises exact replacement, reorder, automatic sync, or
  automatic removal from Apple Music.
- Railway worker is offline or crashing.
- Vercel API routes cannot reach Supabase.
- Apple Music authorization fails or returns a stale token.

## Current status

As of 2026-06-08:

- The platform-first code path builds locally and passes typecheck, lint, tests,
  and production build.
- `/app` is the canonical platform dashboard. `/dashboard` redirects to `/app`
  for compatibility with older links and smoke checks.
- The dashboard, playlist hub, and playlist detail screens use the simplified
  MVP structure: primary organization action, playlist queue visibility, inline
  safety copy, track review, explicit export, and collapsed generation history.
- Logger redaction now recursively sanitizes token-like and secret-like fields.
- Hosted Supabase has platform migrations `platform_playlists` and
  `fix_playlists_updated_at_default` applied.
- Hosted schema was checked directly: `playlist_recipes_scope_check` is
  validated, no playlist recipe rows are unscoped, `playlists.updated_at` is
  not nullable with `now()` default, and platform playlist tables exist.
- Vercel preview deployment
  `https://organize-my-music-git-codex-platfo-cbc5d7-kulibabkaaas-projects.vercel.app`
  built successfully and responded through authenticated Vercel curl for `/`,
  `/app`, `/dashboard`, `/app/playlists`, and `/app/billing`.
- Plain public curl returns `401` because the preview is protected by Vercel.
- `/app` renders the new signed-out workspace state, `/dashboard` redirects to
  `/app`, and signed-out protected app subroutes redirect to `/auth`.
- The preview homepage copy was checked through `vercel curl` and matches the
  platform-first, billing-deferred MVP direction.
- No fatal/error runtime logs were found for preview deployment
  `dpl_4kn5o2LVkDNchBJjGDYrozQULvfg`.
- Local `npm run worker:check` passes against hosted Supabase.
- Local `npm run platform:check` passes against hosted Supabase.
- Hosted pg-boss has `library-sync`, `full-sort`, `playlist-create`, and
  `playlist-generation-export` queues registered, with no queued jobs for those
  queues at verification time.
- Platform-first production smoke verification is pending.
- Worker deployment verification, real Apple Music authorization, library sync,
  Sort export, individual playlist export, and new-music processing still need
  to be verified in the configured environment.

Historical Sort-first smoke from 2026-05-23:

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

## Payment and bypass status

Payment implementation is blocked until explicitly reopened.

Use `PAYMENTS_DEV_BYPASS_ENABLED=true` only for an approved local or staging smoke
test. Never enable a development bypass by default or in production.

## Export safety

App queues playlist creation only after confirmation.

Existing Apple Music playlists are not edited or deleted.

## Rollback/reset notes

Use `/admin/reset-user` only for test accounts when a smoke run needs cleanup.
