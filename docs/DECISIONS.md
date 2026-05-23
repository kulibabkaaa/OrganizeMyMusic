# Architecture Decision Log

## ADR-001 — Apple Music only for MVP

Decision:

Start with Apple Music only.

Reason:

Apple Music already matches the first target use case and the user has an Apple Developer account. Adding Spotify or YouTube Music before Apple Music works end-to-end would multiply complexity.

Status:

Accepted.

## ADR-002 — Ticket-by-ticket Codex workflow

Decision:

Use a ticket-by-ticket workflow with a master roadmap.

Reason:

The project involves real tokens, user data, external APIs, database migrations, deployment configuration, and Apple Music write-back. Small tickets are safer and easier to review.

Status:

Accepted.

## ADR-003 — Use Supabase for Auth and Postgres

Decision:

Use Supabase Auth and Supabase Postgres for MVP.

Reason:

The repo already depends on Supabase. Supabase gives auth, Postgres, RLS, and works well with MCP setup.

Status:

Accepted.

## ADR-004 — Use pg-boss for background jobs

Decision:

Use `pg-boss` for sync, classification, planning, and write-back jobs.

Reason:

The repo already includes `pg-boss`, and Postgres-backed jobs are enough for MVP.

Status:

Accepted.

## ADR-005 — Do not run persistent worker as Vercel serverless

Decision:

Run the worker on a persistent Node process host.

Reason:

The worker needs to continuously process background jobs. Vercel serverless request handlers are not the correct place for a persistent `pg-boss` worker.

Status:

Accepted.

## ADR-006 — Use OpenAI structured outputs

Decision:

Use OpenAI API with structured outputs for classification and playlist planning.

Reason:

The app needs validated JSON that can be stored and used by backend logic. Free-form text is not reliable enough for this product.

Status:

Accepted.

## ADR-007 — AI does not perform write-back

Decision:

AI may propose playlists but must not directly write to Apple Music.

Reason:

Apple Music writes are sensitive and must happen only after user confirmation through backend-controlled logic.

Status:

Accepted.

## ADR-008 — Store raw and normalized tracks separately

Decision:

Store raw Apple Music payloads separately from normalized tracks.

Reason:

Raw payloads allow reprocessing when classification improves. Normalized records make dedupe, classification, and playlist planning easier.

Status:

Accepted.

## ADR-009 — Payment after core flow

Decision:

Stripe payment is optional until the Apple Music flow works end-to-end.

Reason:

Payment before product correctness slows down validation. The core risk is whether the organizer works, not whether Checkout works.

Status:

Accepted.
