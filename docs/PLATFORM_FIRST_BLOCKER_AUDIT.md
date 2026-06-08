# Platform-First Blocker Audit

## Status

This audit is for deciding whether to resume the long-running platform migration goal.

Recommendation: local platform-first implementation work can continue safely.

Latest local audit on 2026-06-08:

- `full-sort` is registered in the persistent worker bootstrap.
- Individual playlist generation exports are queued through `playlist-generation-export`.
- `/api/app/sorts/*` and playlist generation/export API docs match the implemented routes.
- Legacy Sort preview navigation points into `/app/sorts/*`.
- Legacy payment-first Sort copy has been softened for deferred billing.
- Hosted Supabase has platform migrations `platform_playlists` and
  `fix_playlists_updated_at_default` applied.
- `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` pass locally.

Remaining completion verification is external: real Apple Music authorization,
worker deployment, and Apple Music write-back smoke testing require configured
credentials and environment access.

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

### 3. Dirty worktree

Risk: the repository currently has many untracked app-platform files. They look like prior work, not files created in this blocker audit.

Mitigation:

- Do not revert untracked files.
- Keep changes scoped.
- Before a commit, explicitly review `git status` and stage only intended files.

### 4. Billing model

Risk: old docs mention one-time Sort payment. Current strategy defers billing and aims at subscription value.

Decision needed later:

- Subscription limits.
- Free trial behavior.
- Whether one-time payment remains as a fallback.

Not needed for MVP migration foundation.

### 5. New-track processing definition

Risk: "new tracks since last sync" needs a precise source of truth.

Decision needed before PFM-008:

- Use latest completed `library_syncs.created_at`.
- Or compare `track_ownership` across syncs.
- Or store a per-playlist `last_processed_sync_id`.

Recommended:

```text
Per-playlist last_processed_sync_id, plus dashboard-level latest completed sync.
```

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
