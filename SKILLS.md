# SKILLS.md

## Purpose

This file tells Codex which skills to use during the platform-first migration.

The active migration is:

```text
Sort-first Apple Music MVP
→ platform-first library organizer
→ persistent playlists
→ playlist-owned recipes
→ generation/review/export workflow
```

Use this file together with:

- `AGENTS.md`
- `docs/PLATFORM_FIRST_MVP_MIGRATION.md`
- `docs/PLATFORM_FIRST_BLOCKER_AUDIT.md`

## Always-on project rules

- Keep Codex lean.
- Use the smallest relevant context slice first.
- Prefer repo docs, local source, and shell tools before MCP.
- Keep changes additive during migration.
- Do not break the existing Apple Music pipeline.
- No playlist writes before explicit review and confirmation.

## Must-use skills for this migration

### `ui-ux-pro-max`

Path:

```text
/Users/illiakulibaba/.codex/skills/ui-ux-pro-max/SKILL.md
```

Use for all UI/UX work.

Required before:

- Dashboard changes.
- Navigation changes.
- Sort Builder v2.
- Playlist Hub.
- Review/edit-every-track screens.
- Component styling.
- Form layout.
- Accessibility/interaction quality checks.

Workflow:

1. Run its design-system or domain search before major UI work.
2. Apply its priority order: accessibility, interaction, performance, layout, typography.
3. Keep the approved dark Apple Music workspace style.
4. Simplify dense screens.
5. Avoid chatbot UX.

### Product Design plugin

Use for product workflow, visual direction, prototypes, and major IA changes.

Relevant Product Design skills:

- `product-design:get-context`
- `product-design:ideate`
- `product-design:image-to-code`
- `product-design:prototype`
- `product-design:design-qa`

Rules:

- Use `get-context` before major redesign/prototype work.
- Use `ideate` for visual alternatives.
- Use `image-to-code` only after a visual direction is selected.
- Use `design-qa` before handing off coded UI based on a visual target.

### `next-best-practices`

Use for Next.js App Router structure.

Use when touching:

- `src/app`
- route handlers
- server components
- client/server boundaries
- redirects/loading/error routes
- auth-aware app pages

### `build-web-apps:react-best-practices`

Use for React component design.

Use when touching:

- interactive components
- stateful form flows
- client components
- reusable UI primitives
- hydration-sensitive behavior

### `build-web-apps:frontend-testing-debugging`

Use when UI behavior needs verification.

Use for:

- failing component tests
- browser-rendered workflow bugs
- Playwright or screenshot checks
- loading/error/empty states

### `accessibility`

Use for any user-facing screen before handoff.

Check:

- keyboard navigation
- focus states
- semantic labels
- form labels/errors
- contrast
- reduced motion
- table/list accessibility

### `security-and-hardening`

Use for security-sensitive changes.

Required when touching:

- Apple Music user tokens
- developer-token routes
- Supabase service-role usage
- RLS policies
- API auth checks
- user music data access
- logging

### `security-best-practices`

Use with `security-and-hardening` for API and database work.

Focus:

- no raw Apple Music token logging
- no browser exposure of secrets
- user-owned rows only
- safe error messages
- explicit write confirmation

### `supabase-postgres-best-practices`

Use for database migrations and RLS design.

Use when touching:

- `supabase/migrations`
- `docs/DATABASE_MODEL.md`
- playlist tables
- recipe ownership
- generation/review/export tables
- RLS policies

If Supabase MCP is available, inspect applied migrations before applying anything.

### `openai-docs`

Use for OpenAI product/API work.

Use when touching:

- structured outputs
- classification prompts
- playlist planning prompts
- cost-sensitive AI batching
- model/API assumptions

Use official OpenAI docs only when browsing is needed.

### `performance`

Use for high-volume UI and worker paths.

Use when touching:

- large track tables
- library sync display
- playlist review tables
- client-side filtering/search
- generation performance

### `core-web-vitals`

Use when UI changes affect page load or layout stability.

Check:

- no layout shift
- lazy-loaded heavy content
- stable table/list dimensions
- font loading behavior

### `debugging-and-error-recovery`

Use when tests fail or jobs fail.

Use for:

- `pg-boss` worker failures
- Apple Music sync/export failures
- flaky tests
- retry logic
- recovery UX

### `code-review-and-quality`

Use before finishing a large migration slice.

Review for:

- regressions
- missing tests
- unsafe data access
- confusing product states
- overly broad refactors
- docs drift

### `documentation-and-adrs`

Use for architecture decisions.

Use when changing:

- product object model
- database ownership model
- Apple Music export strategy
- billing model
- provider abstraction

### `doc`

Use for small documentation updates.

Use when updating:

- README
- API spec
- migration docs
- runbooks
- handoff notes

## Optional skills by task

### `playwright` or `playwright-skill`

Use after frontend implementation when visual or interaction verification is needed.

Use with the Browser plugin when opening local app pages.

### `copywriting` and `copy-editing`

Use for product copy, empty states, confirmation dialogs, and safety language.

Important terms:

- Prefer `Export to Apple Music`.
- Prefer `Add approved tracks`.
- Avoid `Sync exactly` until Apple Music replacement/removal support is verified.

### `refactoring-ui`

Use for visual polish on dense app screens.

Use with `ui-ux-pro-max`, not instead of it.

### `microinteractions`

Use for small interaction details after core flow works.

Examples:

- autosave status
- review keep/remove feedback
- generation progress
- export confirmation

### `product-design:get-context`

Use again if product direction changes.

Do not ask broad questions if the answer is already in:

- `docs/PLATFORM_FIRST_MVP_MIGRATION.md`
- `docs/PLATFORM_FIRST_BLOCKER_AUDIT.md`

## Migration ticket skill map

### PFM-001 Persistent playlist schema

Use:

- `supabase-postgres-best-practices`
- `security-and-hardening`
- `security-best-practices`
- `documentation-and-adrs`

### PFM-002 Playlist service foundation

Use:

- `best-practices`
- `security-and-hardening`
- `next-best-practices`
- `debugging-and-error-recovery`

### PFM-003 Dashboard simplification

Use:

- `ui-ux-pro-max`
- Product Design plugin
- `accessibility`
- `core-web-vitals`

### PFM-004 Sort Builder v2

Use:

- `ui-ux-pro-max`
- Product Design plugin
- `build-web-apps:react-best-practices`
- `accessibility`
- `build-web-apps:frontend-testing-debugging`

### PFM-005 Playlist Hub

Use:

- `ui-ux-pro-max`
- Product Design plugin
- `build-web-apps:react-best-practices`
- `accessibility`
- `performance`

### PFM-006 Generation model migration

Use:

- `best-practices`
- `openai-docs`
- `performance`
- `debugging-and-error-recovery`

### PFM-007 Review and export migration

Use:

- `security-and-hardening`
- `ui-ux-pro-max`
- `accessibility`
- `debugging-and-error-recovery`
- `code-review-and-quality`

### PFM-008 New music processing

Use:

- `best-practices`
- `performance`
- `debugging-and-error-recovery`
- `copywriting`

## Skills requested but not currently installed

The project instructions mention these source skills:

```text
source-intake
source-build-root
source-ios-swiftui
source-android-compose
source-parity-review
source-python-cli
source-rust-core
source-doc-hygiene
source-generated-cleanup
source-apple-release
source-handoff-packaging
```

They are not present in the current visible skill inventory.

If they become available later, use them when their scope matches. Until then:

- Use `documentation-and-adrs` and `doc` instead of `source-doc-hygiene`.
- Use `next-best-practices` and `build-web-apps:*` instead of `source-build-root`.
- Use `code-review-and-quality` instead of `source-parity-review`.
- Use `debugging-and-error-recovery` instead of `source-generated-cleanup`.

## Final quality gate

Before marking any migration slice complete:

1. Re-read relevant docs.
2. Run the smallest useful tests first.
3. Run broader checks when practical:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

4. Summarize:

- Files changed.
- Behavior added.
- Tests/checks run.
- MCP actions.
- Env changes.
- DB migrations.
- Known limitations.
- Next ticket.
