# Testing Strategy

## Goal

The MVP should be tested enough to avoid breaking auth, token handling, classification, playlist planning, and Apple Music write-back.

## Test layers

## Unit tests

Use unit tests for:

- Environment validation.
- Apple developer token generation shape.
- Encryption/decryption.
- Track normalization.
- Dedupe fingerprinting.
- Classification schema parsing.
- Playlist request parsing.
- Playlist scoring.
- Preview snapshot creation.

## API tests

Use API-level tests where practical for:

- Auth-required routes.
- Invalid request body handling.
- Apple connect endpoint.
- Sync start endpoint.
- Sort-run creation endpoint.
- Confirm endpoint.

## Worker tests

Use mocked clients for worker jobs:

- Apple Music API client mock.
- OpenAI API mock.
- Database operation mock or test database.
- `pg-boss` job handler behavior.

## Integration tests

Use integration tests for:

- User creates sync.
- Worker stores raw tracks.
- Worker normalizes and dedupes.
- Classifier stores outputs.
- Planner creates preview.
- Confirmation queues write-back.

## Manual smoke tests

Before MVP is declared done:

1. Sign up.
2. Connect Apple Music.
3. Sync real library.
4. Generate three playlists.
5. Preview output.
6. Confirm.
7. Verify playlists in Apple Music.

## External API mocks

Do not hit Apple Music or OpenAI in normal test runs.

Mock:

- Fetch responses.
- Apple Music pagination.
- Apple Music create playlist response.
- OpenAI structured output response.
- OpenAI invalid output response.

## Important edge cases

- Duplicate track with same ISRC.
- Duplicate track without ISRC but same title/artist/duration.
- Missing album.
- Missing genre.
- Explicit track.
- Instrumental track.
- Ukrainian-language track.
- Mixed-language track.
- OpenAI returns invalid schema.
- Apple token expired.
- Playlist creation succeeds but track insertion fails.
- Retry after partial failure.

## Required checks

Codex should run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

If a script fails because the repo script itself is outdated or dependencies are missing, fix the script only if it is in scope for the current ticket. Otherwise report the failure.
