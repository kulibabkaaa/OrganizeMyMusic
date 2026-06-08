# Platform-First Migration Goal Prompt

## Goal

Complete the platform-first MVP migration for Organize Your Music.

The product must evolve from a Sort-first Apple Music utility into a platform-first Apple Music library organizer where:

- `Sort` means full-library organization.
- Playlists are persistent app objects.
- Recipes belong to playlists.
- Users can generate proposed tracks from their existing Apple Music library.
- Users can review every playlist and track before export.
- The app creates Apple Music playlists and adds approved tracks only after explicit confirmation.
- The dashboard and playlist hub create recurring value after the initial Sort.

## Product constraints

- Apple Music only.
- No Spotify or YouTube Music code.
- No chatbot UX.
- Product-style UI only: forms, tags, sliders, tables, preview, review, status states.
- Billing deferred.
- MVP only manages playlists created by this app.
- Use `Export`, `Create Apple Music playlist`, and `Add approved tracks` wording.
- Do not promise exact sync, replacement, reorder, or automatic removal from Apple Music until verified.
- No Apple Music write before explicit user confirmation.
- Raw Apple Music user tokens must never be logged or stored unencrypted.
- Keep the existing Apple Music pipeline working while migrating.

## Required skills

Follow `SKILLS.md`.

Use `ui-ux-pro-max` for all UI/UX work.

Use Product Design skills for major workflow/design decisions.

Use Supabase/security skills for migrations, RLS, and auth boundaries.

Use code-review/debugging skills before completion.

## Required implementation scope

### 1. Persistent playlist model

Implement app-owned playlists, playlist-owned recipes, playlist generations, generation tracks, and playlist exports.

Evaluation:

- Additive migration exists.
- RLS protects user-owned rows.
- Existing Sort pipeline is not removed.
- Types and server modules represent the new model.

### 2. Playlist service and API foundation

Implement playlist CRUD and playlist recipe CRUD.

Evaluation:

- User can create/list/update/archive app playlists.
- User can create/update/list a playlist recipe.
- API routes validate input.
- API routes require auth.
- Tests cover validation, mapping, and ownership-safe behavior.

### 3. Dashboard simplification

Simplify dashboard around recurring platform value.

Evaluation:

- Primary action is `Organize My Library`.
- Secondary action is `Create Playlist`.
- Saved playlists and review/new-music queues are visible.
- Billing is not emphasized.
- UI is less dense than the generated visual concepts.

### 4. Sort Builder v2

Make first-time full-library organization comfortable.

Evaluation:

- Left side manages playlists in the Sort.
- Right side edits the selected playlist recipe.
- User can create multiple playlist plans in one session.
- Autosave remains.
- Preview/generate remains blocked until library sync is ready.

### 5. Playlist Hub

Create persistent playlist workspace.

Evaluation:

- `/app/playlists` shows app-created playlists.
- `/app/playlists/[playlistId]` shows tracks, recipe, suggestions/history foundation.
- User can regenerate a playlist without creating a Sort.
- UI supports review-first workflow.

### 6. Generation/review/export migration

Move generation results toward playlist generations while keeping Sort batch review working.

Evaluation:

- One playlist generation stores proposed tracks, scores, reasons, and keep/remove decisions.
- Sort generation can generate many playlist generations.
- User can review every track.
- Export uses explicit confirmation.
- Apple Music writes remain server-side.

### 7. New music processing foundation

Add a user-triggered new-music processing path or clear foundation for it.

Evaluation:

- App can identify new-track processing state or required data.
- Dashboard can show a queue.
- No background/automatic processing is required for MVP.

## Required checks

Run as many as available:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

If a check cannot run because of environment or credentials, document why.

## Completion definition

The goal is complete only when all of these are true:

1. A real user can sign in, connect Apple Music, sync library, and click `Organize My Library`.
2. The user can create at least three persistent playlists through a Sort.
3. Each playlist can have a playlist-owned recipe.
4. The app can generate proposed tracks from the user's existing library.
5. The user can review every playlist and track before export.
6. The app can create Apple Music playlists and add approved tracks after confirmation.
7. Exported playlists persist in the app playlist hub.
8. A user can create or regenerate one playlist without creating a new Sort.
9. The dashboard reflects platform value: saved playlists, review queue, new music queue.
10. Existing security constraints still hold.
11. Tests and docs are updated.
12. Known Apple Music update limitations are documented and reflected in product copy.

## Stop conditions

Stop and report only if:

- Apple Music exact update behavior becomes necessary to finish the current slice.
- Supabase production migration application is requested but MCP/access is unavailable.
- A security issue requires product-owner decision.
- The same blocker repeats across three goal turns.

Otherwise, continue ticket by ticket.
