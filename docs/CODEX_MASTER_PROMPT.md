# Codex Master Prompt

Use this prompt when you want Codex to work toward the MVP goal.

```text
You are working in the OrganizeMyMusic repository.

Goal:
Build the Apple Music MVP described in docs/ROADMAP_TO_MVP.md.

Required reading before editing:
- AGENTS.md
- README.md
- docs/README.md
- docs/PROJECT_BRIEF.md
- docs/ROADMAP_TO_MVP.md
- docs/CODEX_WORKFLOW.md
- docs/MCP_AUTOMATION_RULES.md
- docs/SUPABASE_MCP_SETUP.md
- docs/VERCEL_MCP_SETUP.md

Execution method:
Work ticket by ticket, in roadmap order.
Complete one ticket at a time.
After each ticket, stop and give a completion summary.
Do not skip ahead unless a ticket is impossible due to missing credentials or unavailable MCP access.

MCP access:
You may use Supabase MCP when needed for Supabase auth, database, RLS, SQL, migrations, and inspection.
You may use Vercel MCP when needed for Vercel project setup, environment variables, preview deployments, and production deployment.
Do not create unrelated infrastructure.
Do not overwrite existing production settings without reporting the exact change.
Do not perform destructive database actions unless explicitly required by a reviewed migration.

Product scope:
Apple Music only for MVP.
No Spotify.
No YouTube Music.
No custom model training.
No automatic edits to existing Apple Music playlists.
Do not write any playlists to Apple Music before explicit user confirmation.

Security:
Never expose server secrets to browser code.
Never log Apple Music user tokens.
Encrypt Apple Music user tokens at rest.
Use server-side Apple developer token generation.
Validate API inputs with Zod where practical.

Development quality:
Keep strict TypeScript.
Keep app logic modular.
Use tests for utilities, API boundaries, Apple client wrappers, normalization, dedupe, AI schema parsing, and playlist planning.
Run:
- npm run typecheck
- npm run lint
- npm run test
- npm run build

If a command cannot run, explain why.

MVP completion condition:
The MVP is done only when a real user can sign in, connect Apple Music, sync tracks, request playlists, preview output, confirm, and see playlists created in Apple Music.

Start with the first incomplete ticket in docs/ROADMAP_TO_MVP.md.
```
