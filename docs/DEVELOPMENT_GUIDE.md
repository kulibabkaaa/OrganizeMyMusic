# Development Guide

## Local setup

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Run worker:

```bash
npm run worker
```

Run checks:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Local environment

Create `.env.local` from `.env.example`.

Required for basic app:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
ENCRYPTION_KEY
```

Required for Apple Music:

```text
APPLE_TEAM_ID
APPLE_KEY_ID
APPLE_PRIVATE_KEY
```

Required for OpenAI classification:

```text
OPENAI_API_KEY
```

Required for Stripe later:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_SORT
```

## Development order

Use the roadmap:

```text
docs/ROADMAP_TO_MVP.md
```

Do not build later phases before earlier phases work.

## Coding conventions

- Use strict TypeScript.
- Use small server modules.
- Keep route handlers thin.
- Validate request bodies.
- Avoid passing raw database rows directly into UI if transformation is needed.
- Avoid broad `any`.
- Avoid logging secrets or raw tokens.
- Add tests for utilities and non-trivial logic.

## Suggested folder structure

```text
src/app
  dashboard
  api

src/components
  app
  marketing
  ui

src/lib
  apple
  ai
  auth
  crypto
  db
  jobs
  music
  playlists
  supabase
  utils

src/worker
  index.ts
  jobs

src/types
  domain.ts

supabase/migrations
docs
```

## Worker development

The worker should register job handlers:

```text
library-sync
classify-tracks
plan-playlists
create-apple-playlists
```

The web app queues jobs. The worker processes them.

## Debugging

Use `job_events` for user-visible progress and developer debugging.

Prefer structured events over vague logs.
