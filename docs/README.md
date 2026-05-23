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

## Current project stage

The repo is an early scaffold. It already has:

- Next.js, React, TypeScript, Tailwind.
- Supabase and Postgres dependencies.
- OpenAI dependency.
- Stripe dependency.
- `pg-boss` dependency and basic worker boot.
- Initial database migration.
- Marketing page and mock preview data.

The repo still needs:

- Real authenticated dashboard data.
- Library sync jobs.
- Normalization and dedupe.
- AI classification.
- Playlist planning.
- Preview and confirmation UI.
- Apple Music playlist creation.
- Integration tests and deployment setup.

## Documentation rule

When behavior changes, update the relevant document in this folder. Documentation should stay useful for Codex, not just humans.
