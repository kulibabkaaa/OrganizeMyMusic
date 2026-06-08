# OrganizeMyMusic Documentation

This folder contains the product, architecture, implementation, and Codex workflow documentation for OrganizeMyMusic.

## Recommended reading order

1. `PROJECT_BRIEF.md` — what the product is and what the MVP must prove.
2. `CODEX_WORKFLOW.md` — how Codex should work on the repo.
3. `CODEX_MASTER_PROMPT.md` — the prompt to give Codex when working toward MVP.
4. `ROADMAP_TO_MVP.md` — ticket sequence from current scaffold to MVP.
5. `MVP_ACCEPTANCE_CRITERIA.md` — exact definition of MVP done.
6. `ARCHITECTURE.md` — system shape and service responsibilities.
7. `APPLE_MUSIC_INTEGRATION.md` — Apple Music auth, sync, and write-back.
8. `AI_CLASSIFICATION_STRATEGY.md` — OpenAI usage and classifier rules.
9. `DATABASE_MODEL.md` — database tables, relationships, and recommended changes.
10. `API_SPEC.md` — planned API routes.
11. `SUPABASE_MCP_SETUP.md` — what Codex should do in Supabase.
12. `VERCEL_MCP_SETUP.md` — what Codex should do in Vercel.
13. `VERCEL_ENV_HANDOFF.md` — exact remaining Vercel environment setup.
14. `MCP_AUTOMATION_RULES.md` — safety rules for external MCP actions.
15. `SECURITY_PRIVACY.md` — token handling, privacy, and operational risk.
16. `TESTING_STRATEGY.md` — test plan.
17. `DEPLOYMENT_OPERATIONS.md` — deployment and background worker plan.
18. `WORKER_DEPLOYMENT.md` — persistent worker deployment handoff.
19. `PRODUCTION_SMOKE_TEST.md` — manual end-to-end Apple Music smoke runbook.
20. `DEVELOPMENT_GUIDE.md` — local development workflow.
21. `ENVIRONMENT_VARIABLES.md` — required environment variables.
22. `DECISIONS.md` — architecture decision log.
23. `POST_MVP_SCOPE.md` — features intentionally excluded from MVP.
24. `PLATFORM_FIRST_MVP_MIGRATION.md` — migration plan from Sort-first MVP to persistent playlist platform.
25. `PLATFORM_FIRST_BLOCKER_AUDIT.md` — blocker and decision audit before resuming long-running migration work.
26. `PLATFORM_FIRST_GOAL_PROMPT.md` — definitive objective and completion criteria for the long-running migration goal.
27. `../SKILLS.md` — repo-local skill routing for platform-first migration work.

## Current project stage

As of 2026-06-08, the platform-first migration is implemented locally and on
the PR preview, but completion still requires a fresh end-to-end production
smoke with real Apple Music authorization, library sync, worker processing,
review, and export.

Current platform-first state:

- `Sort` is treated as full-library organization.
- Persistent app playlists, playlist-owned recipes, playlist generations,
  review decisions, playlist exports, and user-triggered new-music processing
  are implemented.
- Dashboard and playlist hub surfaces focus on saved playlists, review queues,
  and new-music queues.
- Legacy Sort write/start endpoints are disabled or compatibility-only and
  guide stale clients into `/app/sorts/*` routes.
- Apple Music write-back remains server-side and gated behind explicit review
  export confirmation.
- Billing is deferred by default while the Apple Music organizing flow is
  verified.

Remaining completion verification:

Automated/local coverage already verifies:

- Platform schema readiness, RLS, required linking columns, worker queue
  registration, and no active, queued, retrying, or failed MVP worker jobs
  through `npm run platform:check`.
- Dashboard, Sort Builder, playlist hub, review, export, new-music, legacy
  compatibility, API validation, and security behavior through the test suite.
- The production smoke checklist in `PRODUCTION_SMOKE_TEST.md` stays aligned
  with the platform-first completion path.

External smoke still needs to verify:

- Real user sign-in.
- Apple Music connect and library sync.
- Full-library organization from `Organize My Library`.
- Creation of at least three persistent playlists through a Sort.
- Review of every playlist and track.
- Apple Music playlist creation and approved-track add after confirmation.
- Exported playlist persistence in `/app/playlists`.
- One-off playlist create/regenerate without creating another Sort.
- Worker deployment smoke in the configured environment.

Historical Sort-first smoke evidence from 2026-05-23:

- Supabase Auth protects the dashboard.
- MusicKit connects Apple Music and stores an encrypted user token.
- The Railway worker syncs Apple Music library songs through `pg-boss`.
- Raw Apple Music payloads, normalized tracks, dedupe counts, classifications,
  playlist requests, preview snapshots, playlist rows, playlist-track rows, and
  job events are stored in Supabase.
- Preview and explicit confirmation are in place before Apple Music write-back.
- A confirmed production run created two real Apple Music playlists.

The next important work is platform-first production verification and safe
quality hardening:

- Keep Apple Music write-back review and confirmation strict.
- Keep matching/scoring quality work active as playlist generation runs through
  the new data model.
- Keep Stripe deferred until the Apple Music organizing quality is acceptable.

## Documentation rule

When behavior changes, update the relevant document in this folder. Documentation should stay useful for Codex, not just humans.
