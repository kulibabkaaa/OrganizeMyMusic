# Environment Variables

Use this as the production deployment checklist for Vercel, the persistent
worker, Supabase, Apple Music, OpenAI, Stripe, and observability.

Do not commit real secrets to `.env.example`, documentation, tests, screenshots,
or support logs. `.env.example` must contain placeholders only.

## Browser-Safe Variables

Only these variables may be exposed to browser code:

| Variable | Required where | Purpose | Production check |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Vercel, local | Canonical app URL used for redirects and checkout URLs. | Must match the URL being tested. |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel, local, worker if needed | Supabase project URL. Browser-safe by design. | Must point to the intended Supabase project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel, local | Supabase anon or publishable key. | RLS must protect all user data. |

No other variable should use the `NEXT_PUBLIC_` prefix.

## Server-Only Variables

These must never be exposed to browser code:

| Variable | Required where | Purpose | Production check |
| --- | --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel server routes, worker, local admin tasks | Service-role Supabase access for server-owned writes and admin reset. | Present only in server/worker env stores. Never prefixed with `NEXT_PUBLIC_`. |
| `DATABASE_URL` | Worker, migrations, local checks | Direct Postgres connection for `pg-boss`, migrations, and `npm run worker:check`. | Uses the intended Supabase pooler/direct URL. Not exposed to browser. |
| `ENCRYPTION_KEY` | Vercel server routes, worker | Encrypts Apple Music user tokens at rest. | At least 32 bytes of random material; same value where tokens are read/written. |
| `APPLE_TEAM_ID` | Vercel server routes, worker | Apple developer team id for developer token signing. | Matches the Apple Music key issuer. |
| `APPLE_KEY_ID` | Vercel server routes, worker | Apple private key id. | Matches the `.p8` key used by `APPLE_PRIVATE_KEY`. |
| `APPLE_PRIVATE_KEY` | Vercel server routes, worker | Full Apple `.p8` private key used server-side to sign developer tokens. | Includes `BEGIN PRIVATE KEY` and `END PRIVATE KEY`; supports real or escaped newlines. |
| `APPLE_MUSICKIT_KEY` | Vercel server routes, worker | MusicKit-related identifier used by the implementation. | Do not confuse with the private key. |
| `OPENAI_API_KEY` | Worker, server routes that classify/parse | OpenAI structured classification and request parsing. | Present only where classification/parsing can run. |
| `AUTH_APPLE_OAUTH_ENABLED` | Vercel server routes | Optional auth-provider flag. | `true`/`1` only after Supabase Apple OAuth is configured. |
| `AUTH_GOOGLE_OAUTH_ENABLED` | Vercel server routes | Optional auth-provider flag. | `true`/`1` only after Supabase Google OAuth is configured. |
| `PAYMENTS_ENABLED` | Vercel server routes | Enables real Stripe Checkout. | Keep `false` or unset while payment implementation is blocked. |
| `PAYMENTS_DEV_BYPASS_ENABLED` | Local/test Vercel only after approval | Enables the explicit development payment bypass. | Keep `false` or unset by default; never enable in production. |
| `STRIPE_SECRET_KEY` | Vercel server routes | Stripe secret key. | Optional while payment is blocked. Required only when `PAYMENTS_ENABLED=true`. |
| `STRIPE_WEBHOOK_SECRET` | Vercel server routes | Stripe webhook signature secret. | Optional while payment is blocked. Required only when webhooks are active. |
| `STRIPE_PRICE_SORT` | Vercel server routes | Stripe price id for one-time Sort checkout. | Optional while payment is blocked. Required only when real checkout is active. |
| `SENTRY_DSN` | Vercel server routes, worker | Optional server-side error monitoring. | Safe to omit. Do not log private music data. |

## Environment Placement Matrix

| Environment | Must include | Must not include |
| --- | --- | --- |
| Browser bundle | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Service role, database URL, Apple private key, OpenAI key, encryption key, Stripe secrets, raw Apple Music user tokens |
| Vercel Production/Preview/Development | Public variables plus server-only variables needed by route handlers | `PAYMENTS_DEV_BYPASS_ENABLED=true` in production |
| Persistent worker host | `DATABASE_URL`, Supabase URL, service role, Apple Music vars, `OPENAI_API_KEY`, `ENCRYPTION_KEY`, optional `SENTRY_DSN` | Browser-only assumptions, Vercel serverless-only setup |
| Local `.env.local` | Development values only | Real production secrets unless explicitly needed and approved |
| `.env.example` | Placeholder values only | Real keys, passwords, private keys, tokens, DSNs tied to a real project |

## Production Deploy Checklist

Before a production deploy:

1. Verify `.env.example` contains placeholders only.
2. Verify Vercel has all required public variables.
3. Verify Vercel has server-only values for Supabase, Apple Music, OpenAI,
   encryption, and optional Stripe/Sentry.
4. Verify no server-only key is configured with a `NEXT_PUBLIC_` prefix.
5. Verify worker host has the same intended commit as Vercel.
6. Verify worker host has `DATABASE_URL`, service role, Apple Music, OpenAI,
   and encryption variables.
7. Verify `PAYMENTS_ENABLED=false` or unset while payment is blocked.
8. Verify `PAYMENTS_DEV_BYPASS_ENABLED` is false/unset in production.
9. Run local checks:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test`
   - `npm run build`
10. Run worker health check in the worker environment:
    - `npm run worker:check`
11. Confirm worker logs contain deployment revision metadata and no secrets.
12. Run `docs/PRODUCTION_SMOKE_TEST.md` before inviting real users.

## Supabase Checks

- Confirm the project URL and anon key match the target project.
- Confirm RLS is enabled on public user-owned tables.
- Confirm service-role access is present only in server/worker environments.
- Confirm the `pgboss` schema exists before worker smoke testing.
- Do not add RLS policies to `pgboss` tables without reviewing pg-boss
  compatibility.

## Apple Music Checks

- `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` must belong to the
  same Apple developer key.
- `APPLE_PRIVATE_KEY` must be the full `.p8` private key.
- Developer tokens are generated server-side only.
- Apple Music user tokens must be stored encrypted with `ENCRYPTION_KEY`.
- Never log raw Apple Music user tokens.

## OpenAI Checks

- `OPENAI_API_KEY` is required only where structured classification or request
  parsing can call OpenAI.
- Prompts and responses may contain private music-library context. Treat them
  as sensitive.

## Stripe Checks

Payment implementation is blocked until explicitly reopened.

- Keep `PAYMENTS_ENABLED=false` or unset.
- Keep `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_SORT`
  unset unless real payment work is explicitly reopened.
- Keep `PAYMENTS_DEV_BYPASS_ENABLED=false` or unset by default.
- Use `PAYMENTS_DEV_BYPASS_ENABLED=true` only for an explicitly approved local
  or test-environment smoke.
- Never enable the development bypass in production.

## Rotation Notes

Rotate immediately if a secret is committed, pasted into chat, exposed in a
browser response, printed in logs, or shared with an unintended environment.

Suggested rotation response:

1. Remove the exposed value from committed files or docs.
2. Rotate the secret at the provider:
   - Supabase service role: rotate Supabase API keys.
   - Supabase database URL password: rotate the database password/pooler secret.
   - Apple private key: revoke the exposed key in Apple Developer and create a
     new `.p8` key.
   - OpenAI API key: revoke the key and create a new scoped key.
   - Stripe secret/webhook keys: roll keys in Stripe and update webhook secret.
   - `ENCRYPTION_KEY`: do not rotate casually. Add a migration/re-encryption
     plan because stored Apple Music user tokens depend on it.
   - Sentry DSN: rotate if project ingestion abuse or unwanted disclosure is a
     concern.
3. Update Vercel, worker host, and local `.env.local` values.
4. Redeploy Vercel and restart the worker.
5. Run `npm run worker:check` and the production smoke checklist.

## Local Development

Use `.env.local` for local development. Never commit `.env.local`.

Use `.env.example` only as a shape reference. It must not contain real
production or development secrets.
