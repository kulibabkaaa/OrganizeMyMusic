# Codex Workflow

## Recommended workflow

Use a ticket-by-ticket workflow with a master roadmap.

Do not use full-batch MVP development. Full-batch development is risky here because the product involves Apple credentials, user tokens, database writes, background jobs, deployment configuration, and AI-generated output. One large Codex run can easily create a large amount of unverified code.

## Best structure

Use this structure:

```text
Master goal: docs/ROADMAP_TO_MVP.md
Execution method: one MVP ticket per Codex run
Code review method: review each ticket before the next one
Branch strategy: mvp/<ticket-id>-short-name
```

## When batching is acceptable

Batching is acceptable for:

- Documentation-only changes.
- UI placeholder screens.
- Type definitions with tests.
- Small utility modules that are tightly related.
- Issue templates and README updates.
- Non-destructive environment documentation.

Batching is not acceptable for:

- Apple Music auth + sync + write-back in one run.
- Database migrations + production code + worker jobs in one run.
- AI classification + playlist creation + confirmation flow in one run.
- Supabase RLS changes without inspection.
- Vercel production deployment without passing checks.
- Payment integration before the core flow is proven.

## Standard Codex prompt

Use this prompt at the start of a ticket:

```text
You are working in the OrganizeMyMusic repo.

Read:
- AGENTS.md
- docs/README.md
- docs/ROADMAP_TO_MVP.md
- docs/UI_PLATFORM_FLOW_ROADMAP.md when the ticket touches app UI, routes,
  Sorts, Playlist Recipes, preview, payment, review, or export
- the documentation file most relevant to this ticket

Work only on ticket: <ticket id and title>

Rules:
- Do not skip ahead to later roadmap tickets.
- Do not add Spotify or YouTube Music.
- Do not expose secrets to the browser.
- Do not write playlists to Apple Music before explicit user confirmation.
- Preserve the public landing page visuals unless the ticket explicitly changes them.
- Keep `/login` and `/dashboard` working while migrating canonical app routes to `/auth` and `/app`.
- Keep TypeScript strict.
- Add or update tests where practical.
- Use Supabase MCP only for the Supabase tasks in the ticket.
- Use Vercel MCP only for the Vercel tasks in the ticket.
- Run typecheck, lint, tests, and build if the local environment supports it.

At the end, report:
- files changed
- behavior added
- tests/checks run
- MCP actions taken
- known limitations
- next recommended ticket
```

## Autonomous multi-ticket prompt

This can be used when Codex is allowed to work through multiple tickets in sequence:

```text
Use docs/ROADMAP_TO_MVP.md as the master goal.

Work through the MVP tickets in order. Complete only one ticket at a time. After each ticket:
1. Stop and summarize the changes.
2. Run available checks.
3. Do not proceed if checks fail.
4. Do not proceed if the next ticket requires real credentials that are not available.
5. Do not proceed if a database migration or destructive operation requires manual review.
6. Do not proceed to production deployment unless the app builds successfully.

You may use Supabase MCP and Vercel MCP when the ticket requires them.

Never add Spotify or YouTube Music during the Apple Music MVP.
Never expose secrets.
Never write to Apple Music before explicit confirmation.
```

## Review checklist per ticket

Before accepting a Codex change, check:

- Does the change match the ticket?
- Did it skip ahead?
- Did it add unnecessary dependencies?
- Did it hard-code credentials or environment-specific values?
- Did it update relevant docs?
- Did it add tests where useful?
- Did it preserve strict TypeScript?
- Did it avoid user-data leaks?
- Did it avoid destructive Apple Music actions?
- Did it describe any MCP actions taken?

## Failure handling

If Codex gets blocked, it should not guess.

Valid blockers include:

- Missing Apple Developer credentials.
- Missing Apple Music permissions.
- Missing Supabase project credentials.
- Missing OpenAI API key.
- Missing Vercel project access.
- Missing local Node installation.
- Missing database.
- Apple Music API behavior that requires live verification.

For blocked tickets, Codex should still create safe scaffolding, tests, and setup instructions where possible.
