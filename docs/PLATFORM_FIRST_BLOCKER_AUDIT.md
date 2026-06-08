# Platform-First Blocker Audit

## Status

This audit is for deciding whether to resume the long-running platform migration goal.

Recommendation: local platform-first implementation work can continue safely.

Latest local audit on 2026-06-08:

- `full-sort` is registered in the persistent worker bootstrap.
- Individual playlist generation exports are queued through `playlist-generation-export`.
- `/api/app/sorts/*` and playlist generation/export API docs match the implemented routes.
- `GET /api/app/playlists/:playlistId` returns the playlist, recipe, latest
  generation, and generation history for playlist hub clients.
- Legacy Sort preview navigation points into `/app/sorts/*`.
- Legacy `/sorts/:id` page links now redirect into `/app/sorts/:id` instead of
  rendering the old standalone preview UI.
- Legacy payment-first Sort copy has been softened for deferred billing.
- Preview and full-organization start copy now avoids checkout-first language while
  billing is deferred.
- `/app/sorts/:sortId/start` is now the canonical full-organization start
  route; legacy `/app/sorts/:sortId/checkout` redirects there for compatibility.
- Unused legacy Sort preview/action components were removed, so stale client
  code no longer points at disabled legacy write/start endpoints.
- Dashboard and connected-library settings no longer surface Spotify or YouTube
  Music cards; MVP UI is Apple Music-only.
- Full-organization start now defaults to billing-deferred unlock so a real MVP user
  can start full-library organization without enabling Stripe or dev bypass.
- `GET /api/apple/connection` now exposes authenticated Apple Music connection
  status without returning raw or encrypted token fields.
- `/app` is the canonical dashboard route and `/dashboard` redirects there.
- Legacy dashboard and checkout helpers now point users at canonical
  `/app/sorts/*` routes while compatibility routes remain available.
- The canonical `/app/sorts/:sortId` status route no longer falls back to the
  legacy `/sorts/:id` preview page when preview data is not ready.
- The playlist hub and playlist detail screens were simplified to reduce
  always-visible metrics, safety panels, and history blocks.
- Dashboard queue metrics now route directly to saved playlists, playlist review,
  and the user-triggered new-music workflow.
- Dashboard review queues now deep-link to `/app/playlists?focus=review`, and
  the playlist hub filters to playlists with proposed tracks waiting for review.
- Dashboard new-music queues now deep-link to the `Process New Music` card on
  the library page.
- Playlist hub cards surface the latest generation review/export state for each
  saved playlist.
- Playlist detail now includes inline playlist-owned recipe editing before
  generation/regeneration.
- Individual playlist creation now recovers when recipe save fails after the
  playlist row is created: retries reuse the existing app playlist instead of
  creating duplicates, and the user can open the playlist to finish setup.
- Playlist detail now exposes app-only playlist archive with copy that Apple
  Music playlists and tracks are not changed.
- New-music recommendations are stored as reviewable playlist generations and
  link back to the playlist workspace for recipe adjustment, review, and
  explicit export.
- New-music generation persistence is idempotent for the same playlist and
  latest sync, so retry after a partial checkpoint failure does not duplicate
  review queues.
- New-music API regressions now cover `not_ready`, `no_playlists`, and
  `no_matches` result states.
- Saved playlists now store `last_processed_new_music_sync_id` for
  user-triggered new-music checks, and the hosted Supabase migration
  `playlist_new_music_processing` is applied.
- Full-organization persistence now has regression coverage for creating persistent app
  playlists, storing reviewable generations, and linking Sort-created recipes to
  those playlists for later Playlist Hub editing.
- Full-organization persistence coverage now explicitly proves a Sort can create
  three persistent app playlists and link each Sort-created recipe to its saved
  playlist.
- Sort Builder advanced recipe controls are collapsed by default and open when
  needed for tag notes or detailed tuning.
- Logger redaction now recursively sanitizes token-like, secret-like, private
  key, cookie, and authorization fields before logs are emitted.
- Token encryption now rejects `ENCRYPTION_KEY` values shorter than 32 bytes
  before encrypting or decrypting Apple Music user tokens.
- Export safety tests now cover both disabled legacy write endpoints and
  invalid playlist-generation export states before any export row or queue job
  is created.
- Legacy `/api/sort-runs/:id/checkout` now returns `409` and cannot mark a Sort
  paid; full organization starts through authenticated `/api/app/sorts/:sortId/checkout`.
- Disabled legacy Sort write/start endpoints now include platform `nextPath`
  and `nextApiPath` guidance, so stale clients get actionable migration routes
  without re-enabling legacy Apple Music writes.
- Legacy `POST /api/sort-runs` playlist-request creation now returns `409`
  with platform Sort creation targets instead of creating old freeform
  playlist-request Sorts.
- Legacy Sort write-back retry now returns `409` with platform review/export
  targets instead of requeuing old playlist creation directly.
- Legacy Sort read responses now preserve read compatibility while returning
  platform `nextPath` and `nextApiPath` targets for stale clients.
- `docs/API_SPEC.md` now matches the implemented platform route contract:
  legacy Sort confirmation is documented as disabled, missing legacy preview
  and event subroutes are listed as unsupported, and the spec points previews
  to `/api/app/sorts/:sortId/preview`.
- Playlist PATCH now rejects client attempts to set server-managed Apple Music
  export fields, so MVP exports cannot be redirected to arbitrary Apple Music
  playlists through the public API.
- Playlist generation export now requires a saved track review before queuing
  Apple Music writes; `ready_for_review` generations cannot be exported.
- Individual playlist track toggles now save keep/remove decisions without
  prematurely marking the whole generation reviewed; only `Mark Review Complete`
  unlocks export.
- Playlist generation export queue handoff failures now mark the generation and
  export row failed with a privacy-safe summary instead of leaving them stuck in
  `exporting`.
- Playlist API regressions now cover cross-user attempts to read, mutate, edit
  recipes, review tracks, generate, and export another user's playlist.
- Archived app playlists now cannot be reopened in the playlist workspace or
  mutated through playlist, recipe, review, generation, or export paths. Active
  detail/recipe APIs return `404` for archived playlists.
- Sort batch export now mirrors reviewed keep/remove choices into persistent
  playlist generation tracks, so Playlist Hub review state matches the exported
  Sort selection.
- Admin Sort-run inspection now requires an authenticated admin profile and
  reads Sort runs, playlist counts, owner profiles, and job events from
  Supabase instead of demo Sort data.
- Full-organization start and preview screens now avoid checkout-first wording
  in the billing-deferred MVP path; copy uses organization, generation, review,
  `Create Apple Music playlists`, and `add approved tracks` language.
- Dead legacy Sort-request client components that posted directly to
  `/api/sort-runs` were removed, so current app UI cannot re-enter the old
  freeform request flow.
- Preview warnings, Sort empty states, processing, and review headings now use
  full-organization wording instead of old paywall-era wording.
- Hosted Supabase has platform migrations `platform_playlists` and
  `fix_playlists_updated_at_default` applied.
- Supabase MCP read-only check on 2026-06-08 confirmed project
  `lxkinmyfcarpnynapewt` is `ACTIVE_HEALTHY` and migrations through
  `playlist_new_music_processing` are applied.
- Vercel MCP read-only log checks on 2026-06-08 found no preview error/fatal
  runtime logs in the prior 2 hours and no production error/fatal runtime logs
  in the prior 24 hours.
- `npm run typecheck`, `npm run lint`, and `npm run test` pass locally.
- `npm run platform:check` passes with required env, encryption-key strength,
  migrations, RLS, linking columns, recipe scope, worker queue registration,
  and no queued MVP jobs.
- Local `npm run build` passes with Next.js `15.5.19`; Vercel preview also
  passes for the PR branch.

Remaining completion verification is external: real Apple Music authorization,
worker deployment, and Apple Music write-back smoke testing require configured
credentials and environment access. Railway CLI is currently unauthorized in
this Codex environment.

## Not blockers for the next implementation slices

These can be built without external credentials or new product decisions:

- Persistent playlist schema.
- Playlist-owned recipe schema and services.
- Dashboard IA simplification.
- Sort Builder v2 UI.
- `/app/playlists` list/detail foundation.
- Review UI based on stored generation rows.
- Tests for validation, mapping, and UI state.

## Blockers or decision points

### 1. Apple Music exact update behavior

Risk: Apple Music API clearly supports creating a library playlist and adding tracks to the end of a library playlist. Exact removal, replacement, and reordering need verification before the app promises perfect in-place updates.

Known docs:

- Create a playlist: `POST /v1/me/library/playlists`
- Add tracks: `POST /v1/me/library/playlists/{id}/tracks`

Decision needed before export/update copy is final:

- MVP exports new app-created playlists only.
- Later updates either append approved tracks, recreate managed playlists, or perform exact replacement if Apple supports it.

Recommended MVP language until verified:

```text
Export to Apple Music
Add approved tracks
```

Avoid promising:

```text
Replace playlist
Sync exactly
Remove old tracks automatically
```

### 2. Existing production database state

Status: platform-first migrations were applied to hosted Supabase on
2026-06-08.

Applied migration names:

- `platform_playlists`
- `fix_playlists_updated_at_default`

Hosted schema verification on 2026-06-08:

- `playlist_recipes_scope_check` is validated.
- `playlist_recipes` has `0` rows where both `playlist_id` and `sort_run_id`
  are null.
- `playlists.updated_at` is `not null` with `now()` default.
- `playlists`, `playlist_generations`, `playlist_generation_tracks`, and
  `playlist_exports` exist with RLS enabled.

Risk for future work: migrations may already be applied in Supabase. Never edit
applied migrations.

Mitigation:

- Use additive migration files only.
- Apply through Supabase MCP when ready.
- Inspect applied migration history before applying.

### 3. Worktree hygiene

Status: resolved in the current platform-first branch. The previous dirty
worktree risk was from untracked app-platform implementation files during the
migration, but the current audited branch is clean after committed slices.

Mitigation:

- Keep changes scoped.
- Before a commit, explicitly review `git status` and stage only intended files.

### 4. Billing model

Risk: old docs mention one-time Sort payment. Current strategy defers billing and aims at subscription value.

Current MVP behavior:

- `PAYMENTS_ENABLED=true` uses Stripe checkout.
- `PAYMENTS_DEV_BYPASS_ENABLED=true` uses the explicitly approved development
  bypass.
- With both flags unset or false, full-organization processing uses billing-deferred
  unlock after the user clicks `Generate full results`.

Decision needed later:

- Subscription limits.
- Free trial behavior.
- Whether one-time payment remains as a fallback.

Not needed for MVP migration foundation.

### 5. New-track processing definition

Status: resolved for MVP foundation on 2026-06-08.

The app compares `track_ownership` between the latest and previous completed
syncs to count newly added songs, then stores
`playlists.last_processed_new_music_sync_id` after user-triggered processing so
the same latest sync is not repeatedly treated as pending for a saved playlist.

Remaining follow-up:

- Decide whether new-music generations should be visually labeled as
  incremental suggestions versus full playlist regenerations in the playlist
  workspace history.

### 6. AI quality and cost

Risk: generating many playlist recipes from large libraries can be expensive or slow.

Mitigation:

- Keep deterministic matching/scoring first.
- Use OpenAI only for ambiguous classification or explanation.
- Batch worker jobs through `pg-boss`.
- Store recipe snapshots and generated tracks to avoid repeated calls.

### 7. UX density

Risk: visual concepts are good but too crowded.

Mitigation:

- MVP dashboard shows only status, primary CTA, saved playlists, and review/new-music queues.
- Dense track tables belong inside playlist detail/review.
- Advanced recipe controls are collapsed by default.

### 8. Local Next production build timeout

Observed on 2026-06-08 during the platform-first implementation:

- `next build` with installed `next@15.5.15` repeatedly stalled at:

```text
Creating an optimized production build ...
```

Diagnostics performed:

- Reproduced with Node `v24.14.0`, matching `package.json` engines.
- Reproduced with Node `v25.9.0`.
- Reproduced with `NEXT_PRIVATE_BUILD_WORKER=0`.
- Reproduced with `--turbopack`.
- Reproduced with `--experimental-build-mode compile`.
- Reproduced after temporarily disabling `typedRoutes`.
- Reproduced with a guarded temporary minimal `src/app/page.tsx` and `src/app/layout.tsx` in the real repo, then restored.
- Memory debug showed low, flat memory use during the stall.
- Process sampling showed the stall is in the Next/SWC native compile path, not in app database calls or route prerendering.
- `npx next@15.2.3 build` compiled but failed later from dependency/version mismatch and is also deprecated for a security vulnerability.
- A clean temporary app with `next@15.5.19`, `react@19.0.0`, and `react-dom@19.0.0` built successfully.

Conclusion:

The timeout was caused by the local installed Next/SWC dependency state, not by the platform-first app source changes.

Resolution:

- Pinned `next` to `15.5.19`.
- Pinned `eslint-config-next` to `15.5.19`.
- Refreshed `node_modules` with `npm ci`.
- Verified `npm run build` passes with Node `v24.14.0`.

Follow-up observed earlier on 2026-06-08:

- Local `npm run build` can still compile and prerender successfully, then fail
  in trace collection with a missing generated `.nft.json` file for
  `app/_not-found`.
- A later local build on 2026-06-08 compiled successfully, then failed while
  collecting page data because `.next/server/pages-manifest.json` was missing.
- Latest local build on 2026-06-08 now passes end-to-end with Next.js
  `15.5.19`.
- If the local shell is on unsupported Node `v25.x`, `npm run build` can still
  reproduce the missing `.next/server/pages-manifest.json` failure. Use the
  declared Node `24.x` runtime from `package.json` for local and CI verification.
- If `next typegen` runs immediately before `next build`, local `.next` state
  can also reproduce that manifest failure. Remove `.next` and rerun
  `npm run build` under Node `24.x`; the clean build and Vercel preview pass.

Remaining follow-up:

- `npm ci` reports 5 dependency audit findings. Handle them in a separate dependency/security ticket so product migration changes stay reviewable.

## Required owner inputs before resuming deep work

Confirmed on 2026-06-08:

- MVP wording uses `Export`, `Create Apple Music playlist`, and `Add approved tracks` until exact Apple Music replace/remove support is verified.
- MVP only manages playlists created by this app.

Do not use product copy that promises exact sync, replacement, reorder, or automatic removal in Apple Music until that capability is verified.

Original decision prompts:

1. MVP Apple Music update language:

```text
Use "Export" and "Add approved tracks" until exact replace/remove support is verified.
```

2. Managed-playlist safety:

```text
MVP only manages playlists created by this app.
```

Everything else can still be decided later.

## Resume plan

Resume with:

1. Validate migration SQL locally where possible.
2. Finish playlist service/API foundation.
3. Add tests.
4. Simplify dashboard and nav.
5. Build Sort Builder v2.
6. Build Playlists hub.
7. Migrate generation/review/export.

Stop only if Apple Music exact update behavior becomes necessary before the current slice can continue.
