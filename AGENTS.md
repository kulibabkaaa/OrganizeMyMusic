# AGENTS.md

## Purpose

This file gives Codex and other coding agents the working rules for the OrganizeMyMusic repository.

OrganizeMyMusic is a web app that lets users connect Apple Music, sync their saved library, generate useful playlists from their existing tracks, preview the proposed output, and create confirmed playlists back in their Apple Music account.

The MVP focuses only on Apple Music. Spotify and YouTube Music are future integrations and must not be added until the Apple Music flow works end-to-end.

## Primary execution rule

Work ticket by ticket from `docs/ROADMAP_TO_MVP.md`.

Do not try to build the entire MVP in one unreviewed code change. Each Codex run should complete one small ticket or one clearly bounded group of related tickets. A ticket is complete only when code, tests, and documentation updates are done or when the blocker is clearly documented.

## Required reading before changes

Before editing code, read:

1. `README.md`
2. `docs/README.md`
3. `docs/ROADMAP_TO_MVP.md`
4. The specific document related to the ticket, for example `docs/APPLE_MUSIC_INTEGRATION.md` for Apple Music work or `docs/AI_CLASSIFICATION_STRATEGY.md` for OpenAI work.

## Non-negotiable product constraints

- Apple Music only for MVP.
- No Spotify or YouTube Music code in MVP.
- No custom model training in MVP.
- No playlist writes before explicit user confirmation.
- No destructive changes to a user's original Apple Music library.
- AI may classify and propose playlists, but the backend must perform Apple Music writes.
- Store raw Apple Music payloads for reprocessing.
- Store normalized track records separately from raw payloads.
- Keep preview snapshots stable after the user reaches confirmation/payment state.
- Payment is optional until the Apple Music flow works end-to-end.

## Security constraints

- Never expose `APPLE_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, or `ENCRYPTION_KEY` to the browser.
- Never log raw Apple Music user tokens.
- Store Apple Music user tokens encrypted at rest.
- Developer tokens are generated server-side.
- User music data is private user data. Do not add analytics or logging that exposes track-level data unless explicitly required and anonymized.
- Treat OpenAI prompts and responses as potentially sensitive because they may contain the user's music library.
- Do not store more user music data than the MVP requires.

## Technical constraints

- Use Next.js App Router.
- Use strict TypeScript.
- Prefer Zod validation at API boundaries.
- Use Supabase Auth and Postgres.
- Use `pg-boss` for long-running sync, classification, and playlist creation work.
- Use OpenAI Structured Outputs for AI-generated classifications and playlist plans.
- Use deterministic heuristics before OpenAI calls where possible.
- Keep domain logic in reusable server modules, not directly inside route handlers.
- Keep UI components separate from data-fetching and mutation logic.
- Do not assume a long-running worker can run inside Vercel serverless functions.

## MCP usage

The user may give Codex MCP access to Vercel and Supabase.

When MCP access is available:

- Use Supabase MCP for database schema, migrations, RLS policies, auth configuration, and database inspection.
- Use Vercel MCP for project creation, environment variables, preview deployments, and production deployment checks.
- Do not create unrelated projects or resources.
- Do not overwrite existing production environment variables without reporting the change.
- Do not run destructive database operations without a migration and a clear explanation.
- Do not deploy to production if typecheck, tests, or build fail.

## Testing expectations

For every ticket, add or update tests where practical.

Expected checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

If Node, dependencies, or environment variables are unavailable, state that clearly in the completion summary and still run any available static checks.

## Branch and commit guidance

Use short feature branches when possible:

```text
mvp/<ticket-id>-short-name
```

Examples:

```text
mvp/mvp-001-dashboard-shell
mvp/mvp-006-apple-token-encryption
mvp/mvp-014-playlist-preview
```

Commit messages should describe the product behavior, not just the files changed.

## Completion summary format

At the end of a Codex run, report:

```text
Ticket completed:
Files changed:
Behavior added:
Tests/checks run:
MCP actions taken:
Environment variables added or changed:
Database migrations added or applied:
Known limitations:
Next recommended ticket:
```

## When blocked

Do not invent external credentials, Apple IDs, private keys, Supabase URLs, Vercel project IDs, or API keys.

If blocked by missing credentials, build the module with explicit environment validation, tests, and clear setup instructions. Then mark the ticket as blocked by credentials rather than pretending the integration was verified.
