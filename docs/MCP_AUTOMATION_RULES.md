# MCP Automation Rules

## Purpose

Codex may receive MCP access to Supabase and Vercel. This file defines what it can and cannot do.

## General rule

MCP tools can touch real external infrastructure. Use them only when the current roadmap ticket requires it.

## Allowed actions

## Supabase MCP

Allowed:

- Inspect projects.
- Inspect tables and policies.
- Apply non-destructive migrations.
- Configure Auth for MVP.
- Verify RLS.
- Verify inserted test data in development.
- Retrieve project URL and anon key names for env setup.

Not allowed:

- Delete project.
- Drop tables.
- Disable RLS broadly.
- Expose service role key to browser.
- Store unencrypted Apple user token.
- Make production-destructive changes without explicit approval.

## Vercel MCP

Allowed:

- Inspect project.
- Create project if missing.
- Add or update required environment variables.
- Deploy preview.
- Inspect build logs.
- Configure production deployment only after successful checks.

Not allowed:

- Delete project.
- Overwrite secrets silently.
- Promote broken builds.
- Store server secrets as public variables.
- Claim the worker is deployed if only the Vercel web app is deployed.

## Required reporting

Any Codex run using MCP must report:

```text
MCP provider used:
Resource inspected:
Resource created:
Resource changed:
Secrets touched:
Production affected:
Risk:
```

## Stop conditions

Codex must stop and report instead of continuing when:

- It finds an existing Supabase or Vercel project with unclear ownership.
- A migration would drop or rewrite data.
- Required credentials are missing.
- Build fails before deployment.
- RLS status is unclear.
- Apple Music writes might happen without confirmation.
- A production environment variable would be overwritten.
