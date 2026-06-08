# Production UI/UX and Sorting Roadmaps

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this roadmap ticket-by-ticket. Work one ticket at a time. Do not batch roadmap tickets.

**Goal:** Bring Organize Your Music from MVP behavior to a production-ready Apple Music web app with reliable UI/UX, clear workflow recovery, and sorting logic that matches the tag-based product promise.

**Architecture:** Keep the Next.js App Router platform flow. Improve UI state and route behavior first, then redesign Sort creation, then upgrade the sorting engine, then harden production reliability. Apple Music write-back must remain blocked until explicit review/export confirmation.

**Tech Stack:** Next.js App Router, React, strict TypeScript, Tailwind, Supabase Auth/Postgres/RLS, pg-boss worker, Apple Music API, OpenAI structured classification where needed.

---

## Execution Rules

- Run one ticket only per Codex goal.
- Before each ticket, read `AGENTS.md`, `README.md`, `docs/README.md`, this roadmap, and the files listed in the ticket.
- Do not redesign unrelated pages.
- Add or update tests where practical.
- Run after each implementation ticket:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
- Stop if a ticket requires real payment implementation, destructive migration, unclear RLS, missing credentials, or Apple Music write-back without explicit review/export confirmation.

---

# Roadmap 1: Production UX Cleanup

**Goal:** Remove trapped states, fake controls, confusing CTAs, and unclear feedback before deeper redesign.

## UX-001: Add Global Workflow Escape Actions

**Status:** Complete on 2026-05-27.

**Goal:** Every long-running or terminal workflow page gives the user a clear way back to Dashboard and Sorts.

**Files to inspect:**
- `src/components/app/processing/processing-page.tsx`
- `src/components/app/export/exporting-page.tsx`
- `src/components/app/export/export-complete-page.tsx`
- `src/components/app/preview/preview-paywall-page.tsx`
- `src/components/app/sort-start/sort-start-page.tsx`
- `src/components/app/review/review-playlists-page.tsx`

**Tasks:**
- Add consistent secondary actions: `Back to dashboard`, `View all Sorts`, and where relevant `Back to builder`.
- Keep one primary CTA per page.
- Ensure links use canonical `/app` routes.
- Add tests that rendered pages include the expected escape links.

**Acceptance criteria:**
- Processing, preview, checkout, review, exporting, and complete pages all have a clear non-destructive way out.
- Long-running pages tell users they can leave and return.
- No page traps the user in a progress state.

---

## UX-002: Fix Library Sync Interaction Model

**Status:** Complete on 2026-05-27.

**Goal:** Starting sync should queue background work and return control immediately.

**Files to inspect:**
- `src/components/app/start-library-sync-button.tsx`
- `src/components/app/dashboard/dashboard-syncing.tsx`
- `src/components/app/library/apple-music-library-card.tsx`
- `src/modules/library-syncs/queue.ts`

**Tasks:**
- Change button copy from blocking language to background language: `Start background sync`, `Sync queued`, `Sync running`.
- Do not make the user wait on the button until sync completes.
- Show a persistent status panel with latest status, track count, retry action, and last error.
- Add a manual refresh/status poll that does not block navigation.

**Acceptance criteria:**
- User can click sync and immediately navigate away.
- Dashboard/library pages show the latest sync state.
- Failed sync has a visible retry path.

---

## UX-003: Clean Review Export CTAs

**Status:** Complete on 2026-05-27.

**Goal:** Review page has one final Apple Music export action and no duplicate/ambiguous export buttons.

**Files to inspect:**
- `src/components/app/review/review-playlists-page.tsx`
- `src/components/app/review/playlist-details-panel.tsx`
- `src/components/app/review/export-confirmation-dialog.tsx`

**Tasks:**
- Remove duplicate `Create playlists in Apple Music` / `Export all playlists` buttons.
- Keep one primary CTA: `Export selected playlists`.
- Keep optional playlist-level export only if it is fully supported; otherwise remove it.
- Update confirmation modal copy to match the single CTA.
- Add tests for single primary export CTA.

**Acceptance criteria:**
- User sees exactly one primary final export action.
- Export confirmation clearly states new playlists only.
- Existing Apple Music playlists are never implied to be modified.

---

## UX-004: Remove Or Wire No-Op Controls

**Status:** Complete on 2026-05-27.

**Goal:** No visible button should do nothing.

**Files to inspect:**
- `src/components/app/review/playlist-track-table.tsx`
- `src/components/app/review/playlist-details-panel.tsx`
- `src/components/app/library/apple-music-library-card.tsx`
- `src/components/app/sort-builder/playlist-recipe-list.tsx`

**Tasks:**
- Remove `Keep` if it does not change state.
- Remove or wire `Save for later`.
- Remove or wire `Regenerate playlist`.
- Keep `Disconnect` disabled only if it has visible explanation.
- Add tests that removed labels no longer render, or wired actions update state.

**Acceptance criteria:**
- No fake controls remain.
- Disabled controls have visible reasons.
- User cannot mistake unavailable functionality for broken functionality.

---

## UX-005: Add Undo / Confirmation For Destructive Review Actions

**Status:** Complete on 2026-05-27.

**Goal:** Deleting playlists, removing tracks, and deleting recipes are recoverable or confirmed.

**Files to inspect:**
- `src/components/app/review/generated-playlist-list.tsx`
- `src/components/app/review/playlist-track-table.tsx`
- `src/components/app/sort-builder/playlist-recipe-list.tsx`
- `src/modules/sorts/review-selection.ts`

**Tasks:**
- Track removed items in state and show `Undo`.
- Confirm playlist deletion if undo is not implemented for that action.
- Show removed count clearly.
- Add unit tests for undo behavior in review selection.

**Acceptance criteria:**
- Removing a track can be undone before export.
- Deleting a generated playlist is either undoable or confirmed.
- Deleting a recipe in builder cannot happen accidentally.

---

## UX-006: Improve Disabled-State Reasons

**Status:** Complete on 2026-05-27.

**Goal:** Every disabled primary action explains what the user must do next.

**Files to inspect:**
- `src/components/app/sort-builder/sort-builder-footer.tsx`
- `src/components/app/sort-start/sort-start-page.tsx`
- `src/components/app/dashboard/dashboard-empty.tsx`
- `src/components/app/library/apple-music-library-card.tsx`

**Tasks:**
- Audit disabled buttons.
- Add visible helper text near each disabled button.
- Avoid hidden-only explanations for primary actions.
- Add tests for common disabled reasons.

**Acceptance criteria:**
- Disabled preview says exactly what is missing.
- Disabled payment says payment is paused or unavailable.
- Disabled provider actions explain current limitation.

---

## UX-007: Add Durable Autosave Feedback

**Status:** Complete on 2026-05-27.

**Goal:** Sort builder autosave is visible, trustworthy, and non-disruptive.

**Files to inspect:**
- `src/components/app/sort-builder/sort-builder.tsx`
- `src/components/app/sort-builder/sort-builder-footer.tsx`

**Tasks:**
- Show `Saving...`, `Saved just now`, `Save failed`, and retry.
- Keep input state local while saving.
- Add last saved timestamp if available.
- Add tests for autosave status rendering.

**Acceptance criteria:**
- User knows draft state without pressing a save button.
- Autosave failure does not erase user input.
- No page refresh happens during normal typing.

---

# Roadmap 2: Sort Builder Redesign

**Goal:** Make creating a Sort simple, understandable, and aligned with what the sorting engine can actually support.

## BUILDER-001: Add Builder Top Bar

**Status:** Complete on 2026-05-27.

**Goal:** Builder has persistent navigation and draft controls.

**Files to inspect:**
- `src/components/app/sort-builder/sort-builder.tsx`
- `src/components/app/sorts/sorts-index.tsx`

**Tasks:**
- Add top actions: `Back to Sorts`, `Drafts`, autosave status.
- Keep preview action in footer or sticky action area.
- Add tests for top actions.

**Acceptance criteria:**
- User can leave builder without losing draft.
- User can navigate to all drafts.
- Autosave status is visible above the fold.

---

## BUILDER-002: Redesign Recipe List And Editor Hierarchy

**Status:** Complete on 2026-05-27.

**Goal:** The builder clearly separates Sort-level settings from playlist-plan settings.

**Files to inspect:**
- `src/components/app/sort-builder/sort-builder.tsx`
- `src/components/app/sort-builder/playlist-recipe-list.tsx`
- `src/components/app/sort-builder/playlist-recipe-editor.tsx`

**Tasks:**
- Rename user-facing `Playlist Recipe` to `Playlist plan` unless internal terminology must remain.
- Make left column a compact playlist-plan list.
- Make right column the selected plan editor.
- Put advanced settings below primary tags/notes.
- Add responsive behavior for mobile.

**Acceptance criteria:**
- User can tell they are building one Sort with multiple playlist plans.
- Mobile layout does not require horizontal scrolling.
- Selected playlist plan is obvious.

---

## BUILDER-003: Replace Target Size Text Input

**Status:** Complete on 2026-05-27.

**Goal:** Target size becomes reliable structured input.

**Files to inspect:**
- `src/components/app/sort-builder/playlist-recipe-editor.tsx`
- `src/modules/playlist-recipes/schema.ts`
- `src/components/app/sort-builder/sort-builder-validation.ts`

**Tasks:**
- Replace free text with presets: `15-25`, `25-50`, `50-100`, `Custom`.
- For custom, show min/max numeric inputs.
- Validate min <= max and max <= 500.
- Add tests for parser/validation removal if parser becomes unused.

**Acceptance criteria:**
- User cannot type invalid target sizes.
- Saved recipe stores numeric min/max.
- UI copy matches stored behavior.

---

## BUILDER-004: Redesign Tag Picker

**Status:** Complete on 2026-05-27.

**Goal:** Tags feel like guided choices, not raw form fields.

**Files to inspect:**
- `src/components/app/sort-builder/tag-picker.tsx`
- `src/components/app/sort-builder/tag-chip.tsx`
- `src/modules/playlist-recipes/tags.ts`

**Tasks:**
- Use grouped category tabs or segmented controls.
- Show suggestions per category.
- Add search/custom value input only after suggestions.
- Prevent duplicate tags visibly.
- Add tests for duplicate and selected states.

**Acceptance criteria:**
- User can add common tags in one or two clicks.
- Selected tags are obvious.
- Duplicate tags cannot be created.

---

## BUILDER-005: Hide Unsupported Advanced Tags

**Status:** Complete on 2026-05-27.

**Goal:** UI does not promise sorting dimensions the engine cannot honor.

**Files to inspect:**
- `src/modules/playlist-recipes/tags.ts`
- `src/modules/playlist-recipes/adapter.ts`
- `src/components/app/sort-builder/tag-picker.tsx`

**Tasks:**
- Keep fully supported categories visible: mood, genre, language, energy, activity.
- Hide or label as experimental: era, region, artist style, custom.
- If hidden, keep schema backward compatible.
- Add tests that visible categories match supported categories.

**Acceptance criteria:**
- The user only sees tag categories that affect matching.
- Existing saved advanced tags still render if already present.

---

## BUILDER-006: Make Tag Notes Meaningful Or Remove Them

**Status:** Complete on 2026-05-27.

**Goal:** Tag notes either influence sorting or are removed from the main UI.

**Files to inspect:**
- `src/components/app/sort-builder/tag-note-panel.tsx`
- `src/modules/playlist-recipes/adapter.ts`
- `src/modules/sorts/playlist-rules.ts`

**Tasks:**
- Option A: feed tag notes into rule compilation as soft positive/negative text.
- Option B: move tag notes behind an advanced drawer with copy saying they are for review context only.
- Add tests for whichever behavior is chosen.

**Acceptance criteria:**
- UI does not imply notes affect sorting unless they do.
- Review/preview can show notes where useful.

---

## BUILDER-007: Add Builder Quality Checklist

**Status:** Complete on 2026-05-27.

**Goal:** Builder tells users whether each playlist plan is ready for preview.

**Files to inspect:**
- `src/components/app/sort-builder/sort-builder-validation.ts`
- `src/components/app/sort-builder/playlist-recipe-list.tsx`
- `src/components/app/sort-builder/sort-builder-footer.tsx`

**Tasks:**
- Add validation states per playlist plan: name, at least one supported tag, valid target size.
- Show status in list cards.
- Disable preview only for true blockers.
- Add tests for validation states.

**Acceptance criteria:**
- User can see exactly which playlist plan needs attention.
- Preview disabled reason points to the specific issue.

---

# Roadmap 3: Sorting Engine V2

**Goal:** Build a reliable, explainable scoring engine that makes the tag UI honest.

## SORT-001: Define Canonical Tag Ontology

**Status:** Complete on 2026-05-27.

**Goal:** Tags map to supported sorting concepts with synonyms.

**Files to inspect:**
- `src/modules/playlist-recipes/tags.ts`
- `src/modules/playlist-recipes/adapter.ts`
- `src/types/domain.ts`

**Tasks:**
- Create `src/modules/sorting/tag-ontology.ts`.
- Define canonical values and synonyms for mood, genre, language, energy, activity.
- Add tests for synonym normalization.

**Acceptance criteria:**
- `sad`, `melancholic`, and `heartbreak` can map predictably.
- `hip hop`, `rap`, and `trap` map predictably.
- Unsupported tags return explicit unsupported results.

---

## SORT-002: Create Track Feature Profile Model

**Status:** Complete on 2026-05-27.

**Goal:** Sorting uses one normalized track profile shape.

**Files to inspect:**
- `src/types/domain.ts`
- `src/modules/sorts/preview-snapshot.ts`
- `src/modules/classification/heuristics.ts`

**Tasks:**
- Create `src/modules/sorting/track-profile.ts`.
- Include track id, Apple song id, title, artist, album, genre, language, moods, energy, explicit, year if available, confidence.
- Add adapter from `NormalizedTrack + TrackClassification`.
- Add tests for profile creation.

**Acceptance criteria:**
- Preview and full sort can share the same feature profile.
- Missing classification is represented safely.

---

## SORT-003: Compile Playlist Plans Into Weighted Rules

**Status:** Complete on 2026-05-27.

**Goal:** Convert UI tags into scoring rules.

**Files to inspect:**
- `src/modules/playlist-recipes/adapter.ts`
- `src/modules/sorts/playlist-rules.ts`

**Tasks:**
- Create `src/modules/sorting/rule-compiler.ts`.
- Hard rules: explicit exclusion, language if selected.
- Weighted rules: mood, genre, activity, energy.
- Add unsupported tag warnings.
- Add tests for compiled rules.

**Acceptance criteria:**
- Every visible tag category produces a scoring effect.
- Unsupported tags create warnings instead of silently doing nothing.

---

## SORT-004: Implement Track Scoring Engine

**Status:** Complete on 2026-05-27.

**Goal:** Score every track against every playlist plan with explanations.

**Files to inspect:**
- `src/modules/sorts/playlist-rules.ts`

**Tasks:**
- Create `src/modules/sorting/scoring.ts`.
- Score hard filters, weighted matches, confidence, energy range, and tag notes if supported.
- Return score, rejection reason, and explanation phrases.
- Add fixture-based unit tests.

**Acceptance criteria:**
- Matched tracks include human-readable reasons.
- Rejected tracks include a reason for quality stats.
- Scores are deterministic.

---

## SORT-005: Enforce Target Size And Duplicate Policy

**Status:** Complete on 2026-05-27.

**Goal:** Playlist assembly respects user constraints.

**Files to inspect:**
- `src/modules/sorts/playlist-rules.ts`
- `src/types/domain.ts`

**Tasks:**
- Create `src/modules/sorting/playlist-assembler.ts`.
- Sort candidates by score.
- Enforce min/max target size where enough candidates exist.
- Avoid duplicates across playlists when policy says so.
- Add tests for overlapping candidates.

**Acceptance criteria:**
- Duplicate policy changes output.
- Target max is respected.
- Quality warning appears if target min cannot be reached.

---

## SORT-006: Add Diversity Rules

**Status:** Complete on 2026-05-27.

**Goal:** Generated playlists avoid too many tracks from one artist/album.

**Files to inspect:**
- `src/modules/sorting/playlist-assembler.ts`

**Tasks:**
- Add artist diversity penalty.
- Add album diversity penalty.
- Keep high-score exceptions if library is small.
- Add tests with repeated artist fixtures.

**Acceptance criteria:**
- Playlist output is not dominated by one artist unless unavoidable.
- Warnings explain when diversity could not be satisfied.

---

## SORT-007: Replace Old Requested Playlist Generator

**Status:** Complete on 2026-05-27.

**Goal:** Preview and full sort use Sorting Engine V2.

**Files to inspect:**
- `src/modules/sorts/lightweight-preview.ts`
- `src/modules/sorts/full-sort-job.ts`
- `src/modules/sorts/playlist-rules.ts`

**Tasks:**
- Route playlist generation through new compiler/scorer/assembler.
- Keep old function only as compatibility wrapper if needed.
- Preserve preview limit of three visible tracks.
- Add tests for preview and full sort outputs.

**Acceptance criteria:**
- Preview and full sort agree on scoring behavior.
- Preview remains lightweight.
- Full sort only starts after paid state.

---

## SORT-008: Add Sorting Quality Warnings

**Status:** Complete on 2026-05-27.

**Goal:** Users know when rules are weak, unsupported, or low-confidence.

**Files to inspect:**
- `src/modules/sorts/lightweight-preview.ts`
- `src/components/app/preview/playlist-preview-card.tsx`
- `src/components/app/review/playlist-track-table.tsx`

**Tasks:**
- Add warnings for unsupported tags, too few matches, low confidence, duplicate pressure, missing metadata.
- Show warnings in preview and review.
- Add tests for warning display.

**Acceptance criteria:**
- Bad or weak playlist plans are explainable.
- User can adjust recipe before payment.

---

# Roadmap 4: Production Hardening

**Goal:** Make the app reliable, observable, accessible, and safe enough for real users.

## PROD-001: Add Route-Level Loading And Error States

**Status:** Complete on 2026-05-27.

**Goal:** Dynamic app pages handle loading/error states cleanly.

**Files to inspect:**
- `src/app/(app)/app/**/page.tsx`

**Tasks:**
- Add `loading.tsx` and `error.tsx` where slow routes exist.
- Use consistent app shell loading skeletons.
- Add tests where renderable.

**Acceptance criteria:**
- No blank screens during slow server loads.
- Route errors show recovery links.

---

## PROD-002: Add Polling For Long-Running Pages

**Status:** Complete on 2026-05-27.

**Goal:** Sync, processing, and exporting update without manual refresh.

**Files to inspect:**
- `src/components/app/processing/processing-page.tsx`
- `src/components/app/export/exporting-page.tsx`
- `src/components/app/start-library-sync-button.tsx`
- `src/app/api/library-syncs/route.ts`

**Tasks:**
- Add small client polling components for status pages.
- Poll every 2-5 seconds.
- Stop polling after terminal status.
- Add tests for polling state if practical.

**Acceptance criteria:**
- Progress pages update automatically.
- Polling stops when completed or failed.

---

## PROD-003: Build Status-Specific Empty States

**Status:** Complete on 2026-05-27.

**Goal:** Empty screens explain the exact current filter/state.

**Files to inspect:**
- `src/components/app/sorts/sort-empty-state.tsx`
- `src/components/app/sorts/sorts-index.tsx`

**Tasks:**
- Add copy for no drafts, no processing, no ready reviews, no failed, no exported.
- Include relevant action per empty state.
- Add tests for each filter empty state.

**Acceptance criteria:**
- Filtered empty states are not generic.
- Each empty state has one useful next action.

---

## PROD-004: Mobile Review Redesign

**Status:** Complete on 2026-05-27.

**Goal:** Review page works on mobile without horizontal table pain.

**Files to inspect:**
- `src/components/app/review/playlist-track-table.tsx`
- `src/components/app/review/review-playlists-page.tsx`

**Tasks:**
- Render track cards on small screens.
- Keep table on desktop.
- Ensure remove/undo controls are touch-friendly.
- Add responsive tests or snapshot render tests.

**Acceptance criteria:**
- No required horizontal scrolling on mobile review.
- Track title, artist, reason, and actions are readable.

---

## PROD-005: Accessibility Pass

**Status:** Complete on 2026-05-27.

**Goal:** Core workflows are usable with keyboard and screen readers.

**Files to inspect:**
- `src/components/app/**/*.tsx`
- `src/components/ui/**/*.tsx`

**Tasks:**
- Fix dialog focus trap and Escape close.
- Ensure all controls have visible labels.
- Ensure focus rings are visible.
- Ensure icon-only controls have labels if added.
- Add accessibility tests where practical.

**Acceptance criteria:**
- Export modal can be opened, confirmed, cancelled, and escaped by keyboard.
- Tab order follows visual order.
- Disabled controls have accessible explanations.

---

## PROD-006: Add Privacy-Safe Observability

**Status:** Complete on 2026-05-27.

**Goal:** Track workflow health without exposing private music data.

**Files to inspect:**
- `src/modules/activity/*`
- `src/modules/library-syncs/queue.ts`
- `src/modules/sorts/full-sort-job.ts`
- `src/worker/*`

**Tasks:**
- Log event types and counts, not raw track names.
- Add job duration and failure category.
- Add dashboard/admin visibility for failed jobs.
- Add tests for no raw track payload in logs if practical.

**Acceptance criteria:**
- Failures can be diagnosed by stage.
- Logs do not include Apple Music user tokens or raw library payloads.

---

## PROD-007: Add User Data Reset Tool For Development

**Status:** Complete on 2026-05-27.

**Goal:** Safe reset of one test account without manual SQL.

**Files to inspect:**
- `src/app/admin/*`
- `src/lib/auth/session.ts`
- Supabase user-owned tables

**Tasks:**
- Add admin-only reset action by email.
- Show counts before deletion.
- Require typed confirmation.
- Delete auth user and cascaded app data.
- Remove pg-boss jobs tied to the user id.
- Add tests for permission checks.

**Acceptance criteria:**
- Only admin users can reset account data.
- Reset never runs without confirmation.
- Apple Music external library is not touched.

---

## PROD-008: Add End-To-End Smoke Checklist

**Status:** Complete on 2026-05-27.

**Goal:** Codex and humans can verify production readiness consistently.

**Files to inspect:**
- `docs/`
- Existing tests under `tests/`

**Tasks:**
- Create `docs/PRODUCTION_SMOKE_TEST.md` or update existing file.
- Cover signup, Apple Music connect, sync, draft, preview, full-organization start, processing, review, export.
- Include expected result and rollback/reset notes.

**Acceptance criteria:**
- A tester can follow the doc without knowing the codebase.
- The checklist identifies where payment is blocked or bypassed in development.

---

## PROD-009: Production Environment Checklist

**Status:** Complete on 2026-05-27.

**Goal:** Deployment config is explicit before real users test.

**Files to inspect:**
- `.env.example`
- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/WORKER_DEPLOYMENT.md`

**Tasks:**
- Verify required env vars for Vercel, worker, Supabase, Apple, OpenAI, Stripe.
- Mark browser-safe vs server-only vars.
- Add rotation notes for leaked/changed secrets.
- Add worker deployment health check steps.

**Acceptance criteria:**
- A production deploy can be checked without guessing.
- Secrets are not exposed to browser code.

---

# Recommended Goal Order

Use these as separate Codex goals:

1. `Implement UX-001 only from docs/superpowers/plans/2026-05-27-production-ui-sorting-roadmaps.md`
2. Continue through `UX-002` to `UX-007`.
3. Then run `BUILDER-001` to `BUILDER-007`.
4. Then run `SORT-001` to `SORT-008`.
5. Then run `PROD-001` to `PROD-009`.

Do not start Sorting Engine V2 before the UX cleanup. The product currently has trapped states and no-op controls; fixing those first makes later sorting validation meaningful.
