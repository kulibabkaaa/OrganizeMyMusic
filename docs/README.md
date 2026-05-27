# OrganizeMyMusic Documentation

This folder contains the product, architecture, implementation, and Codex workflow documentation for OrganizeMyMusic.

## Recommended reading order

1. `PROJECT_BRIEF.md` — what the product is and what the MVP must prove.
2. `CODEX_WORKFLOW.md` — how Codex should work on the repo.
3. `CODEX_MASTER_PROMPT.md` — the prompt to give Codex when working toward MVP.
4. `ROADMAP_TO_MVP.md` — ticket sequence from current scaffold to MVP.
5. `UI_PLATFORM_FLOW_ROADMAP.md` — platform-first UI flow after the working MVP, with no landing page redesign.
6. `MVP_ACCEPTANCE_CRITERIA.md` — exact definition of MVP done.
7. `ARCHITECTURE.md` — system shape and service responsibilities.
8. `APPLE_MUSIC_INTEGRATION.md` — Apple Music auth, sync, and write-back.
9. `AI_CLASSIFICATION_STRATEGY.md` — OpenAI usage and classifier rules.
10. `DATABASE_MODEL.md` — database tables, relationships, and recommended changes.
11. `API_SPEC.md` — planned API routes.
12. `SUPABASE_MCP_SETUP.md` — what Codex should do in Supabase.
13. `VERCEL_MCP_SETUP.md` — what Codex should do in Vercel.
14. `VERCEL_ENV_HANDOFF.md` — exact remaining Vercel environment setup.
15. `MCP_AUTOMATION_RULES.md` — safety rules for external MCP actions.
16. `SECURITY_PRIVACY.md` — token handling, privacy, and operational risk.
17. `TESTING_STRATEGY.md` — test plan.
18. `DEPLOYMENT_OPERATIONS.md` — deployment and background worker plan.
19. `WORKER_DEPLOYMENT.md` — persistent worker deployment handoff.
20. `PRODUCTION_SMOKE_TEST.md` — manual end-to-end Apple Music smoke runbook.
21. `DEVELOPMENT_GUIDE.md` — local development workflow.
22. `ENVIRONMENT_VARIABLES.md` — required environment variables.
23. `DECISIONS.md` — architecture decision log.
24. `POST_MVP_SCOPE.md` — features intentionally excluded from MVP.

## Current project stage

As of 2026-05-23, the Apple Music MVP path has completed one production smoke
test with a real Apple Music account:

- Supabase Auth protects the dashboard.
- MusicKit connects Apple Music and stores an encrypted user token.
- The Railway worker syncs Apple Music library songs through `pg-boss`.
- Raw Apple Music payloads, normalized tracks, dedupe counts, classifications,
  playlist requests, preview snapshots, playlist rows, playlist-track rows, and
  job events are stored in Supabase.
- Preview and explicit confirmation are in place before Apple Music write-back.
- A confirmed production run created two real Apple Music playlists.

The next important work is quality hardening:

- Continue tuning matching/scoring with more real-library feedback.
- Use the preview diagnostics to explain why requests have few or no matches.
- Deploy the tuned scoring to both Vercel and the persistent Railway worker
  before the next real sorting smoke test.
- Continue expanding sorting tests across Ukrainian, Russian, English, Polish,
  mixed, instrumental, and unknown tracks.
- Keep Stripe deferred until the Apple Music organizing quality is acceptable.
- Use `UI_PLATFORM_FLOW_ROADMAP.md` for the next UI/product phase: `/auth`,
  `/app`, reusable Sorts, Playlist Recipes, preview before payment, payment per
  Sort, review, then explicit Apple Music export.
- Keep the existing landing page visuals; only route CTAs into the new platform
  flow when the relevant UI ticket is implemented.

## Documentation rule

When behavior changes, update the relevant document in this folder. Documentation should stay useful for Codex, not just humans.
