# Roadmap to MVP

## Purpose

This is the master execution plan for Codex.

Codex should work through this file in order. Each ticket should be completed with code, tests, and relevant documentation updates before moving to the next ticket.

## Workflow decision

Use ticket-by-ticket development, not one large batch.

Reason: this MVP touches authentication, Apple Music tokens, private user music data, database migrations, AI output, deployment configuration, and real Apple Music write actions. Those areas need small, reviewable steps.

## MVP target

The MVP is complete when a real user can:

1. Sign up or sign in.
2. Connect Apple Music.
3. Sync at least 500 saved Apple Music library tracks.
4. Request custom playlists.
5. Preview proposed playlists and included tracks.
6. Confirm the playlists.
7. Have the playlists created in their real Apple Music account.
8. See completion or failure status.

## Current known repo state

The repo already contains:

- Next.js App Router.
- TypeScript.
- Tailwind.
- Supabase dependencies.
- OpenAI dependency.
- Stripe dependency.
- `pg-boss` dependency.
- Basic worker boot.
- Initial database migration.
- Marketing page.
- Mock preview data.
- Domain types.

The repo still needs the real product pipeline.

---

# Phase 0 — Project baseline and documentation

## MVP-000 — Add development documentation

Status: documentation task.

Create the documentation files in `docs/` and root `AGENTS.md`.

Acceptance criteria:

- `AGENTS.md` exists.
- `docs/ROADMAP_TO_MVP.md` exists.
- `docs/CODEX_WORKFLOW.md` exists.
- `docs/SUPABASE_MCP_SETUP.md` exists.
- `docs/VERCEL_MCP_SETUP.md` exists.
- Codex has clear ticket-by-ticket instructions.

## MVP-001 — Verify local baseline

Status: complete on 2026-05-22.

Goal: verify the current repo can install, typecheck, test, and build.

Tasks:

- Install dependencies.
- Run typecheck.
- Run lint.
- Run tests.
- Run build.
- Fix obvious script/config issues only if needed.
- Do not add product features in this ticket.

Acceptance criteria:

- `npm install` works.
- `npm run typecheck` works or the failure is documented.
- `npm run lint` works or the failure is documented.
- `npm run test` works or the failure is documented.
- `npm run build` works or the failure is documented.

---

# Phase 1 — Auth, dashboard, and Supabase foundation

## MVP-002 — Create dashboard shell

Status: complete on 2026-05-22.

Goal: create the `/dashboard` route that the landing page already links to.

Tasks:

- Add `/dashboard`.
- Add signed-out state.
- Add signed-in placeholder state.
- Add Apple Music connection placeholder state.
- Add library sync placeholder state.
- Add sort-run placeholder state.
- Use existing visual style.

Acceptance criteria:

- `/dashboard` route exists.
- User can understand the pipeline from dashboard states.
- No real Apple Music calls yet.
- Typecheck passes.

## MVP-003 — Supabase MCP project setup

Status: complete on 2026-05-22.

Goal: configure Supabase for the MVP.

Tasks for Codex with Supabase MCP:

- Inspect whether a Supabase project already exists.
- Do not create a duplicate project if one already exists.
- Configure Supabase Auth for email login.
- Confirm project URL and anon key.
- Confirm database connection availability.
- Record required env vars in `.env.example` and Vercel env docs.

Acceptance criteria:

- Supabase project is identified or created.
- Supabase Auth is available.
- Required env vars are documented.
- No service role key is exposed to browser code.

## MVP-004 — Supabase client wiring

Status: complete on 2026-05-22.

Goal: add Supabase clients for browser and server use.

Tasks:

- Add browser client utility.
- Add server client utility.
- Add authenticated session helper.
- Add protected dashboard behavior.
- Create profile row on first user login if needed.

Acceptance criteria:

- Signed-out users see sign-in CTA.
- Signed-in users can access dashboard.
- Profile row exists for signed-in user.
- Tests cover auth helper behavior where practical.

## MVP-005 — Database schema and RLS review

Status: complete on 2026-05-22.

Goal: make the database safe for user data.

Tasks:

- Review existing migration.
- Add missing schema needed for playlist requests, playlist rules, token encryption metadata, and job tracking if needed.
- Add RLS policies for user-owned tables.
- Ensure service-role-only access where appropriate.
- Use Supabase MCP to inspect applied migrations and policies.

Acceptance criteria:

- User-owned rows are protected by RLS.
- Users cannot read other users' music data.
- Service role can run worker jobs.
- Migration is documented.
- No destructive migration is applied without explanation.

---

# Phase 2 — Apple Music connection

## MVP-006 — Apple developer token generation

Status: complete on 2026-05-22.

Goal: generate Apple Music developer tokens server-side.

Tasks:

- Add server-only utility for Apple Music developer JWT generation.
- Use `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY`.
- Handle private key formatting safely.
- Add API route for browser to request developer token.
- Add tests for missing env and token shape.

Acceptance criteria:

- Apple private key never reaches browser code.
- Developer token is generated server-side.
- Missing env vars produce clear errors.
- Tests pass.

## MVP-007 — MusicKit browser authorization

Status: complete on 2026-05-22.

Goal: let the user authorize Apple Music in the browser.

Tasks:

- Load/configure MusicKit on the client.
- Request developer token from backend.
- Trigger Apple Music authorization.
- Receive Apple Music user token.
- Send user token to backend connection endpoint.
- Do not log raw token.

Acceptance criteria:

- User can click Connect Apple Music.
- Backend receives user token.
- Token is not logged.
- Connection status appears in dashboard.

## MVP-008 — Encrypt and persist Apple Music user token

Status: complete on 2026-05-22.

Goal: securely store the Apple Music user token.

Tasks:

- Add encryption utility using `ENCRYPTION_KEY`.
- Encrypt token before database storage.
- Store encrypted token in `apple_music_connections`.
- Add `token_encryption_version` if missing.
- Add decrypt helper for server/worker use.
- Add tests for round-trip encryption and wrong-key failure.

Acceptance criteria:

- Raw user token is never stored.
- Raw user token is never logged.
- Worker/server can decrypt token when needed.
- Tests pass.

## MVP-009 — Apple Music API client

Status: complete on 2026-05-22.

Goal: create reusable Apple Music API client wrapper.

Tasks:

- Add client for Apple Music library endpoints.
- Support `Get All Library Songs`.
- Support pagination.
- Support create playlist.
- Support add tracks to playlist.
- Add typed response handling.
- Add retry/error handling for common failures.

Acceptance criteria:

- API client is isolated from route handlers.
- Tests use mocked fetch.
- Pagination behavior is tested.
- Errors are normalized.

---

# Phase 3 — Library sync and normalization

## MVP-010 — Queue library sync job

Status: complete on 2026-05-22.

Goal: start a background job when user requests library sync.

Tasks:

- Add API route to start library sync.
- Create `library_syncs` row.
- Queue `pg-boss` job.
- Dashboard shows sync status.
- Worker registers sync job handler.

Acceptance criteria:

- User can start sync from dashboard.
- Job event is created.
- Worker picks up job in local/dev environment.
- Sync status can be fetched.

## MVP-011 — Store raw Apple Music tracks

Status: complete on 2026-05-22.

Goal: fetch and store raw library track payloads.

Tasks:

- Use Apple Music API client.
- Fetch saved library songs.
- Store raw track JSON in `library_tracks_raw`.
- Store raw count in `library_syncs`.
- Emit job events.

Acceptance criteria:

- Raw track payloads are stored as JSONB.
- Sync count is visible.
- Failures are recorded in `library_syncs.error_summary`.

## MVP-012 — Normalize and dedupe tracks

Status: complete on 2026-05-22.

Goal: create stable internal track records.

Tasks:

- Normalize title, artist, and album.
- Prefer ISRC for dedupe when available.
- Use fallback fingerprint of normalized artist + title + duration bucket.
- Insert into `tracks_normalized`.
- Link user ownership via `track_ownership`.
- Track duplicate count.

Acceptance criteria:

- Same song is not stored repeatedly as separate canonical tracks.
- User ownership is preserved.
- Tests cover normalization and dedupe edge cases.

## MVP-013 — Sync progress UI

Status: complete on 2026-05-22.

Goal: show actual sync status in the dashboard.

Tasks:

- Add sync progress/status component.
- Show raw track count.
- Show normalized track count.
- Show duplicate count.
- Show latest job events.
- Show failure state.

Acceptance criteria:

- Dashboard reflects real database sync state.
- User can see whether sync is running, complete, or failed.

---

# Phase 4 — Classification and playlist planning

## MVP-014 — Deterministic classification heuristics

Status: complete on 2026-05-22.

Goal: classify obvious tracks without AI.

Tasks:

- Use Apple genre metadata where possible.
- Detect instrumental where possible.
- Add basic language hints from metadata if reliable.
- Mark classification source as `metadata` or `heuristic`.
- Store confidence.

Acceptance criteria:

- Obvious genres are classified without OpenAI.
- Classifications are stored in `track_classifications`.
- Tests cover genre normalization.

## MVP-015 — OpenAI structured classification

Status: complete on 2026-05-22.

Goal: classify ambiguous tracks with OpenAI.

Tasks:

- Use OpenAI API with structured JSON schema.
- Batch ambiguous tracks.
- Return language, genre, subgenre, moods, energy, confidence.
- Include Ukrainian, Russian, mixed, instrumental, and unknown language handling.
- Store `metadata_hash` and classifier version.
- Do not send unnecessary user-identifying data.

Acceptance criteria:

- OpenAI output is schema-validated.
- Invalid model output fails safely.
- Classifications are stored.
- Tests cover schema validation and fallback behavior.

## MVP-016 — Playlist request parser

Status: complete on 2026-05-22.

Goal: convert user playlist instructions into structured rules.

Tasks:

- Let user enter requested playlists in text form.
- Parse examples like `Ukrainian rap`, `gym rap`, `sad Slavic songs`.
- Use OpenAI structured output only when needed.
- Store request in `playlist_requests`.
- Store parsed rules as JSONB.

Acceptance criteria:

- User can define at least three playlist requests.
- Parsed rules are reviewable.
- Tests cover simple deterministic parsing.

## MVP-017 — Playlist planner

Status: complete on 2026-05-22.

Goal: match classified tracks to requested playlists.

Tasks:

- Select tracks based on language, genre, mood, energy, and explicitness rules.
- Support multi-dimensional playlists.
- Allow tracks to appear in multiple playlists when appropriate.
- Add score and reason per playlist-track relation.
- Avoid empty playlists where possible.
- Generate playlist title and description.

Acceptance criteria:

- Planner produces playlists from existing library tracks.
- Each playlist has track count and reasons.
- Tests cover Ukrainian rap, mood playlist, genre playlist, and empty-result cases.

## MVP-018 — Preview snapshot

Status: complete on 2026-05-22.

Goal: freeze the generated output before confirmation.

Tasks:

- Create `sort_runs` row.
- Store preview snapshot JSON.
- Store generated playlists and playlist tracks.
- Keep snapshot immutable once confirmed/payment begins.

Acceptance criteria:

- User can load a stable preview.
- Regenerating does not silently alter a confirmed preview.
- Preview contains playlist names, descriptions, tracks, scores, and reasons.

---

# Phase 5 — Preview UI and confirmation

## MVP-019 — Preview UI

Status: complete on 2026-05-22.

Goal: show the proposed playlists before writing anything to Apple Music.

Tasks:

- Show playlist cards.
- Show included tracks.
- Show track artist/title/album.
- Show confidence/reason where useful.
- Allow user to deselect whole playlists.
- Allow user to remove individual tracks if practical.

Acceptance criteria:

- User can inspect output clearly.
- User can decide whether to confirm.
- No Apple Music write occurs from preview page.

## MVP-020 — Confirmation flow

Status: complete on 2026-05-22.

Goal: explicitly confirm before Apple Music write-back.

Tasks:

- Add confirmation page or modal.
- Show exact number of playlists and tracks to create.
- Require explicit action, not page load.
- Queue playlist creation job after confirmation.

Acceptance criteria:

- No write-back happens without confirmation.
- Confirmation queues job.
- State changes to `creating_playlists`.

---

# Phase 6 — Apple Music write-back

## MVP-021 — Create Apple Music playlists

Status: complete on 2026-05-22.

Goal: create selected playlists in user's Apple Music account.

Tasks:

- Worker decrypts Apple Music user token.
- Worker creates Apple Music playlist for each selected playlist.
- Store Apple playlist ID.
- Emit job events.
- Handle partial failure.

Acceptance criteria:

- Apple playlists are created.
- Apple playlist IDs are stored.
- Partial failures are visible.

## MVP-022 — Add tracks to Apple Music playlists

Status: complete on 2026-05-22.

Goal: populate the created playlists.

Tasks:

- Add selected Apple Music track IDs to created playlists.
- Respect Apple Music API payload requirements.
- Handle batch sizes if needed.
- Emit progress events.
- Mark sort run complete when finished.

Acceptance criteria:

- Confirmed tracks appear in real Apple Music playlists.
- Completed run state is visible.
- Failures are recorded.

## MVP-023 — Recovery and retry

Status: complete on 2026-05-22.

Goal: make failed jobs recoverable.

Tasks:

- Add retry action for failed sync/classification/write-back.
- Add user-visible error summary.
- Add admin/developer job event view if practical.
- Avoid duplicate playlist creation during retries.

Acceptance criteria:

- Failed jobs can be retried safely.
- Retry does not create duplicate playlists if playlist IDs already exist.
- User sees useful status.

---

# Phase 7 — Deployment and external services

## MVP-024 — Vercel MCP setup

Status: complete on 2026-05-22.

Current state: Vercel MCP is authenticated and can inspect teams, projects, and
deployments. Existing project `kulibabkaaas-projects/organize-my-music`
(`prj_78lnTMHyyYcqppVMFfwPBu31vimn`) was found and linked locally. Required
Production and Preview env vars are configured for Supabase, Apple Music,
OpenAI, Sentry, and `ENCRYPTION_KEY`. Public Supabase/app URL env vars are
configured for Production, Preview, and Development. Stripe env vars were
intentionally deferred until payment is activated.

Preview deployment `dpl_376SpY9WvEQdwpFCZ6rCJTf6oPyB` is `READY` at
`https://organize-my-music-oap93gdsl-kulibabkaaas-projects.vercel.app`.
The landing page and signed-out dashboard load successfully. The Apple
developer-token API returns `401` while signed out, which matches the route's
auth guard.

Goal: deploy the web app.

Tasks for Codex with Vercel MCP:

- Inspect existing Vercel project.
- Create project only if none exists.
- Configure environment variables.
- Deploy preview.
- Verify build.
- Do not deploy production if checks fail.

Acceptance criteria:

- Vercel project is configured.
- Preview deployment works.
- Required env vars are present.
- Secrets are not exposed as public variables.

## MVP-025 — Worker deployment plan

Status: complete on 2026-05-23.

Current state: Railway is the selected MVP worker host because it can run a
persistent Node process separately from Vercel serverless. The Railway service
uses `npm run worker` and is online. Supabase MCP confirms that the worker
initialized the `pgboss` schema and internal queue tables after the deployed
worker connected with the corrected `DATABASE_URL`.

Security note: Supabase reports RLS disabled on `pgboss` internal tables. Do
not change these blindly; review whether the `pgboss` schema is exposed through
PostgREST before applying RLS or grants changes, because pg-boss needs direct
database access for worker operations.

Goal: deploy or document the worker process.

Tasks:

- Decide worker hosting target.
- Do not assume Vercel serverless can run the persistent worker.
- Configure `DATABASE_URL`.
- Verify worker can connect to Supabase Postgres.
- Document run command.

Acceptance criteria:

- Worker can run outside normal web request lifecycle.
- Worker startup is documented.
- Background jobs are processed in deployed environment.

## MVP-026 — Production smoke test

Status: complete on 2026-05-23 with documented limitations.

Current state: a real production smoke test completed with the user's Apple
Music account. The user signed in, connected Apple Music through MusicKit,
synced the library, saved three playlist requests, reviewed the preview, gave
explicit confirmation, and verified that two playlists were created in the real
Apple Music app.

Evidence:

- Vercel Production alias: `https://organize-my-music.vercel.app`.
- Confirmed sort run: `4fede120-bc0e-4d9b-861b-477cc236a2e5`.
- Confirmed library sync: `9d30ecd1-d786-4aff-aec3-4c839e858a1f`.
- Supabase `library_syncs` recorded `status = completed`, `raw_track_count =
  377`, `normalized_track_count = 359`, and `duplicate_count = 18`.
- Supabase `sort_runs` recorded `state = completed`.
- Supabase `sort_playlists` recorded two selected playlist rows with stored
  Apple Music playlist IDs.
- Job events recorded: `Apple Music write-back finished: 2 playlists created,
  0 already existed, 3 tracks added.`

Known limitations:

- The test library contained 377 raw tracks, so the 500-track target was not
  independently exercised in this smoke run.
- Sorting quality needs hardening. The first real run produced very small
  playlists and one requested playlist with no tracks, so the core flow works
  but matching/scoring quality is not yet good enough.
- Stripe remains intentionally deferred until after Apple Music quality work.

Goal: test full flow with a real Apple Music account.

Tasks:

- Sign up.
- Connect Apple Music.
- Sync a real library.
- Generate at least three playlists.
- Preview output.
- Confirm.
- Verify playlists in Apple Music.
- Record failures.

Acceptance criteria:

- Full flow works once end-to-end.
- Known issues are documented.
- MVP acceptance criteria are satisfied.

---

# Phase 8 — Optional after core MVP works

## MVP-027 — Stripe one-time payment gate

Status: deferred. The user explicitly chose to skip Stripe until the Apple
Music flow works and sorting quality improves.

Goal: add payment only after product flow works.

Tasks:

- Add Stripe checkout after preview and before final confirmation if desired.
- Store payment status.
- Freeze preview before checkout.
- Use webhook verification.
- Do not block unpaid local/dev test flows.

Acceptance criteria:

- Paid confirmation path works.
- Webhook updates payment state.
- User cannot pay for a changing preview.

---

# Phase 9 — Quality hardening after first production smoke

## MVP-028 — Sorting quality evaluation and low-match handling

Status: complete on 2026-05-23.

Current state: preview snapshots now preserve every requested playlist even when
no tracks match. Each requested playlist includes aggregate match diagnostics
without non-matching track names or private raw library data. Empty diagnostic
playlists are excluded from the default confirmation selection and are filtered
again in the confirmation service before any Apple Music write-back job is
queued.

Implemented:

- Aggregate match stats per requested playlist: total tracks checked,
  classified tracks, missing classifications, matched tracks, and rejection
  counts by explicit, language, genre, mood, energy, and score.
- Low-match warnings in preview for empty or tiny playlists.
- Empty playlist cards remain inspectable but cannot be selected in the UI.
- Confirmation ignores empty selected playlists defensively, so a crafted
  request cannot queue an empty Apple Music playlist.
- Synthetic tests cover Ukrainian, Russian, Polish, English, mixed,
  instrumental, and unknown language classifications.

Known limitation: this improves visibility and safety around weak matches, but
does not yet tune the scoring weights enough to produce larger or better
playlists from the user's real library.

Goal: improve playlist quality after the first real Apple Music smoke test.

Tasks:

- Add a repeatable way to inspect why tracks matched or did not match each
  requested playlist without exposing private library data in logs.
- Improve low-match handling so empty or tiny playlists are clearly called out
  before confirmation.
- Review scoring for language, genre, mood, and use-case rules.
- Add focused tests using synthetic Ukrainian, Russian, Polish, English, mixed,
  instrumental, and unknown tracks.
- Preserve the explicit confirmation gate before any Apple Music write-back.

Acceptance criteria:

- Preview explains low-confidence or empty playlist output before confirmation.
- Sorting tests cover the languages and cases required by the MVP.
- No new Apple Music writes are introduced outside the existing confirmation
  flow.

## MVP-029 — Sorting score tuning for real-library quality

Status: not started.

Goal: improve match quality and playlist size using the diagnostics added in
MVP-028.

Tasks:

- Review real low-match diagnostics for representative playlist requests.
- Tune language, genre, subgenre, mood, and energy weights.
- Add broader synthetic fixtures for Slavic, rap, workout, sad, electronic,
  chill, driving, and mixed-language cases.
- Keep deterministic rules first and OpenAI bounded to structured
  classification/planning outputs.
- Preserve explicit confirmation and retry-safe Apple Music write-back.

Acceptance criteria:

- Common requests produce plausible, non-empty playlists when matching tracks
  exist in the synced library.
- Low-confidence matches are explained rather than silently accepted.
- Tests cover the tuned scoring behavior without using private user library
  data.

---

# Final MVP checklist

The MVP is done only when all of these are true:

- Auth works.
- Apple Music connection works.
- User token is encrypted.
- Library sync works.
- Raw payloads are stored.
- Normalized tracks are stored.
- Dedupe works.
- Classification works.
- User playlist requests work.
- Playlist planner works.
- Preview works.
- Confirmation is explicit.
- Apple Music playlist creation works.
- Tracks are added to playlists.
- Failure and retry paths exist.
- Deployment works.
- One real-world smoke test succeeds.
