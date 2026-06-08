# Environment Variables

## Public variables

Only these variables may be exposed to browser code.

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Server-only variables

These must never be exposed to browser code.

```text
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
ENCRYPTION_KEY
APPLE_TEAM_ID
APPLE_KEY_ID
APPLE_PRIVATE_KEY
APPLE_MUSICKIT_KEY
OPENAI_API_KEY
AUTH_APPLE_OAUTH_ENABLED
AUTH_GOOGLE_OAUTH_ENABLED
PAYMENTS_ENABLED
PAYMENTS_DEV_BYPASS_ENABLED
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_SORT
SENTRY_DSN
```

## Variable purpose

## `NEXT_PUBLIC_APP_URL`

Base app URL.

Local example:

```text
http://localhost:3000
```

Production example:

```text
https://your-app.vercel.app
```

## `NEXT_PUBLIC_SUPABASE_URL`

Supabase project URL.

## `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Supabase anonymous browser key.

This is public but RLS must protect data.

## `SUPABASE_SERVICE_ROLE_KEY`

Server-only Supabase service role key.

Used by worker/server operations. Never expose to browser.

## `DATABASE_URL`

Postgres connection string.

Used by `pg-boss`, migrations, and worker.

## `APPLE_TEAM_ID`

Apple Developer Team ID.

## `APPLE_KEY_ID`

Apple Music private key ID.

## `APPLE_PRIVATE_KEY`

Apple private key used to sign Apple Music developer tokens.

Store as a Vercel secret/server-only env var. The implementation accepts normal PEM newlines or escaped `\n` sequences.

## `APPLE_MUSICKIT_KEY`

Optional MusicKit-related identifier if used by implementation.

Do not confuse this with the private key.

## `OPENAI_API_KEY`

Server-only OpenAI API key.

## `AUTH_APPLE_OAUTH_ENABLED`

Server-only auth feature flag.

## `AUTH_GOOGLE_OAUTH_ENABLED`

Server-only auth feature flag.

## `PAYMENTS_ENABLED`

Server-only payment feature flag. Keep `false` while billing is deferred. When
`PAYMENTS_ENABLED` and `PAYMENTS_DEV_BYPASS_ENABLED` are both unset or false,
the platform-first MVP lets an authenticated user start full-organization processing
through the explicit billing-deferred `Generate full results` action on
`/app/sorts/:sortId/start`.

## `PAYMENTS_DEV_BYPASS_ENABLED`

Server-only development bypass flag. Never enable the development bypass in production.

## `STRIPE_SECRET_KEY`

Server-only Stripe secret key. Optional until payment ticket.

## `STRIPE_WEBHOOK_SECRET`

Stripe webhook verification secret. Optional until payment ticket.

## `STRIPE_PRICE_SORT`

Legacy Stripe price ID for one-time sort/payment. Do not add new dependency on this variable during the platform-first migration.

Payment is deferred until Apple Music organization quality is strong and the subscription model is defined.

## `SENTRY_DSN`

Optional error monitoring DSN.

## `ENCRYPTION_KEY`

Server-only key used to encrypt Apple Music user tokens.

Recommended:

- At least 32 bytes of cryptographically secure random data.
- The app rejects shorter values before encrypting or decrypting Apple Music user tokens.
- Do not rotate casually without migration plan.
- Add encryption version field in database.

The Apple Music connection route requires this variable before it can persist a music user token.

## Local `.env.local`

Use `.env.local` for local development.

Never commit `.env.local`.

## Vercel

Add all required vars to Vercel environment settings.

Only `NEXT_PUBLIC_*` variables should be public.

## Supabase

Supabase MCP should confirm:

- Project URL.
- Anon key.
- Service role key.
- Database URL.

## Production Deploy Checklist

- `.env.example` contains placeholders only.
- Only `NEXT_PUBLIC_*` variables are exposed to browser code.
- Server-only secrets are configured only in server/worker environments.
- `PAYMENTS_ENABLED=false` while billing is deferred.
- `PAYMENTS_DEV_BYPASS_ENABLED=false` by default.
- Never enable the development bypass in production.
- Worker health checks pass before production smoke testing.

## Rotation Notes

- Rotate `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, Stripe secrets, and Apple private keys through the hosting provider secret manager.
- Rotate `ENCRYPTION_KEY` only with a migration plan for encrypted Apple Music user tokens.
- After rotation, run `npm run worker:check` and a safe authenticated smoke test.
