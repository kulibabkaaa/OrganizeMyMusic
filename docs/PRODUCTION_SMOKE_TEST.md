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
- Supabase migration history includes `platform_playlists`,
  `fix_playlists_updated_at_default`, `playlist_new_music_processing`, and
  `unique_zero_dollar_sort_unlocks`.
- Supabase has platform tables `playlists`, `playlist_generations`,
  `playlist_generation_tracks`, and `playlist_exports` with RLS enabled.
- `playlist_recipes_scope_check` is validated, `playlists.updated_at` is not
  nullable with a `now()` default, and
  `idx_payments_unique_zero_dollar_sort_unlock` exists.
- `npm run platform:check` passes in the deployment environment.
- `npm run smoke:preflight` passes from a trusted machine. This checks
  production `/api/health`, signed-out `/` and `/dashboard`, and GitHub
  deployment statuses for Vercel and Railway without touching Apple Music.
- `docs/PLATFORM_FIRST_SMOKE_EVIDENCE.md` is ready to record the manual smoke
  result, production commit, worker status, counts, job IDs, Apple playlist IDs,
  and limitations.
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
    least 500 saved songs. If the smoke account has fewer saved songs, record
    the actual count and continue only if the full library is synced correctly.
13. Confirm normalized and duplicate counts are shown.
14. Preview generation.
15. Confirm the preview snapshot stays stable after the organization is started
    and before export; playlist names, counts, and selected tracks should not
    silently change across refreshes.
16. Use at least three playlist recipes, for example:
    - Ukrainian rap
    - gym rap
    - sad Slavic songs
17. Start full organization from `/app/sorts/{sortId}/start` with billing
    deferred; use development bypass only in approved local/staging smoke.
18. Full-organization processing.
19. Review playlist names, descriptions, track counts, and included tracks.
20. Deselect playlists or remove tracks that should not be created.
21. If any playlist has zero matched tracks, confirm review can still be
    completed and the empty generation does not stay in the review queue.
22. Confirm export copy uses `Create Apple Music playlist`, `Export`, or `add
    approved tracks`, and does not promise replacement, reorder, automatic sync,
    or automatic removal.
23. Explicit export to Apple Music only when the review is acceptable.
24. Verify the app queues playlist creation.
25. Verify the Railway worker completes the job.
26. Verify the playlists appear in the real Apple Music account.
27. Verify exported app-created playlists appear in `/app/playlists`.
28. Open one exported playlist in `/app/playlists/:playlistId`.
29. Confirm the playlist shows recipe details, latest generated tracks, export
    status, and generation history.
30. Create one new playlist from `/app/playlists/new` without starting a Sort.
31. Save its playlist-owned recipe.
32. Generate proposed tracks from the latest synced Apple Music library.
33. Review every proposed track, remove or restore at least one track, click
    `Mark Review Complete`, then queue `Create Apple Music playlist`.
34. Verify the individual playlist export is processed by the persistent worker
    and the app playlist receives an Apple playlist ID.
35. Run a second library sync after adding at least one song to Apple Music.
36. Click `Process New Music` from the library page.
37. Confirm recommendations are review-only and based on saved playlist recipes.
38. Confirm matching recommendations are saved as playlist review queues and
    visible when opening the recommended playlist.
39. Retry `Process New Music` and confirm the same latest sync does not create
    duplicate new-music review queues.
40. Record any partial failures and retry behavior.
41. Update `docs/PLATFORM_FIRST_SMOKE_EVIDENCE.md` with the full result before
    claiming the platform-first MVP goal is complete.
42. Run
    `SMOKE_EVIDENCE_STRICT=true SMOKE_USER_EMAIL=listener@example.com npm run smoke:evidence`
    and add its aggregate output to the evidence log. This command is
    read-only, must exit non-zero while completion warnings remain, and must
    not print track names, recipe text, raw Apple payloads, or tokens.

## Historical Sort-first smoke path

The old Sort-first smoke path is retained only as historical context in earlier
roadmap notes and old smoke evidence. Do not execute it as an MVP acceptance
gate. Current completion must use the platform-first smoke path above.

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

- Platform-first PR #1 was merged to `main`.
- Vercel Production aliases `https://organize-my-music.vercel.app`.
- Railway reports worker deployments through the GitHub commit status check.
- `npm run smoke:preflight` is the authoritative safe check for current
  production health, deployed commit, signed-out route behavior, and
  Vercel/Railway deployment status.
- A recorded safe preflight passed for production commit
  `25784c0fc748b73a008d6aa57d062f324224501c`.
- Production `/` returns the platform-first landing page with signed-out CTAs
  routed to `/auth`.
- Production `/dashboard` resolves to the canonical `/app` signed-out workspace.
- Vercel Production runtime logs had no `error` or `fatal` entries in the
  first 30 minutes checked after deployment.
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
- Local `npm run smoke:preflight` verifies the production health route,
  signed-out landing/dashboard surfaces, and successful Vercel/Railway GitHub
  deployment statuses without creating jobs or using Apple Music credentials.
- `npm run smoke:preflight` is the authoritative safe preflight after each
  deployment. It prints the currently deployed production commit and must pass
  before manual Apple Music smoke begins.
- Hosted pg-boss has `library-sync`, `full-sort`, `playlist-create`, and
  `playlist-generation-export` queues registered, with no active, queued,
  retrying, or failed jobs for those queues at verification time.
- Hosted Supabase has `unique_zero_dollar_sort_unlocks` applied; duplicate
  deferred/dev Sort unlock markers were cleaned up and the unique index is in
  place.
- Platform-first production smoke verification is partially complete for safe
  unauthenticated routes, production deployment, Railway deployment status, and
  hosted schema/queue readiness.
- Real Apple Music authorization, library sync, Sort export, individual
  playlist export, and new-music processing still require a real signed-in user
  with Apple Music access.
- `docs/PLATFORM_FIRST_SMOKE_EVIDENCE.md` is the required evidence log for that
  remaining real-user smoke.

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

Stripe payment implementation is deferred until explicitly reopened.

Billing is deferred by default for the platform-first MVP. Use
`PAYMENTS_DEV_BYPASS_ENABLED=true` only for an approved local or staging smoke
test when you need to exercise that legacy path.

Never enable a development bypass by default or in production.

## Export safety

App queues playlist creation only after confirmation.

Existing Apple Music playlists are not edited or deleted.

## Rollback/reset notes

Use `/admin/reset-user` only for test accounts when a smoke run needs cleanup.
