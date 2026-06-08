# Security and Privacy

## Data sensitivity

OrganizeMyMusic handles sensitive user data:

- User account data.
- Apple Music user token.
- Music library contents.
- Track preferences inferred from playlists.
- AI prompts and outputs that may reveal taste or language/culture.

Treat music library data as private user data.

## Secrets

Server-only secrets:

```text
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
APPLE_TEAM_ID
APPLE_KEY_ID
APPLE_PRIVATE_KEY
OPENAI_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
ENCRYPTION_KEY
```

Browser-safe variables only:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Apple Music user token

Rules:

- Never store raw token.
- Never log raw token.
- Encrypt before database write.
- Decrypt only server-side or inside worker.
- Add encryption versioning.
- Plan for key rotation later.

Log hardening:

- Runtime logs use recursive sanitization for token-like, secret-like,
  private-key-like, cookie, and authorization fields.
- Do not add new logging that serializes raw Apple Music token payloads, raw
  Apple Music API responses, or full prompt bodies.

## Apple private key

Rules:

- Never send to browser.
- Never log.
- Never store in source control.
- Use only in server-side developer token generation.

## OpenAI data minimization

When sending track data to OpenAI:

Include:

- Track title.
- Artist.
- Album if needed.
- Genre names.
- Duration if useful.
- Existing classification hints.

Avoid:

- User email.
- Supabase user ID.
- Apple user token.
- Full raw Apple payload if not needed.
- Unrelated account metadata.

## RLS

Supabase RLS must prevent users from seeing each other's:

- Apple Music connection status.
- Library syncs.
- Raw tracks.
- Track ownership.
- Sort runs.
- Generated playlists.
- Job events.
- Payment records.

## Logging

Never log:

- Raw Apple user token.
- Apple private key.
- Supabase service role key.
- OpenAI API key.
- Stripe secret key.
- Encryption key.

Avoid logging full track libraries. Log counts and status instead.

Acceptable logs:

```text
Synced 500 raw tracks.
Normalized 480 tracks.
Detected 20 duplicates.
Classified 112 ambiguous tracks with OpenAI.
Created 3 Apple Music playlists.
```

## Confirmation safety

No Apple Music write-back before explicit confirmation.

Confirmation must show:

- Number of playlists to create.
- Names of playlists.
- Number of tracks per playlist.
- Any user deselections.

## Retry safety

Retries must be idempotent.

If `apple_playlist_id` exists, do not create another playlist for that generated playlist. Retry track insertion instead.

## Payment

Payment is optional until core MVP works.

If payment is added:

- Use Stripe Checkout.
- Verify webhooks.
- Do not trust client-side payment status.
- Freeze preview before full processing starts.
