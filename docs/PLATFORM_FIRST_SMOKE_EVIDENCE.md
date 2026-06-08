# Platform-First Smoke Evidence

## Purpose

Use this file to record the real production Apple Music smoke run that proves
the platform-first MVP is complete.

Do not mark the long-running goal complete from automated checks alone. The MVP
requires a real signed-in user, real Apple Music authorization, real library
sync, real review, and confirmed Apple Music playlist creation.

## Safe Preflight Evidence

Latest safe preflight command:

```bash
npm run smoke:preflight
```

This command is read-only. It checks production health, signed-out production
routes, and Vercel/Railway GitHub deployment statuses. It does not connect Apple
Music, start sync jobs, create playlist jobs, or write Apple Music playlists.

After the manual smoke actions, run the read-only database evidence checker:

```bash
SMOKE_USER_EMAIL=listener@example.com npm run smoke:evidence
```

For final completion proof, run the same checker in strict mode:

```bash
SMOKE_EVIDENCE_STRICT=true SMOKE_USER_EMAIL=listener@example.com npm run smoke:evidence
```

This prints masked user identity plus aggregate sync, playlist, generation,
review, export, and new-music counts. It does not print track names, artist
names, Apple Music user tokens, raw Apple payloads, recipe text, or playlist
names.
Strict mode exits non-zero if any completion row is still warning-only.
It separately checks Sort-created playlists and the one-off playlist
recipe/generation/export path.

Record the output here before each manual smoke run:

```text
Date:
Operator:
Production URL:
Health commit:
Vercel status:
Railway status:
Result:
Notes:
```

Recorded safe preflight example:

```text
Date: 2026-06-08
Operator: Codex
Production URL: https://organize-my-music.vercel.app
Health commit: 00cb40ea781f90670e415993b8a8550bbacd0a29
Vercel status: success, production deployment dpl_2MkzXwCN6SqpEsCByDdpFeEmdUL6
Railway status: success, GitHub context "hearty-recreation - OrganizeMyMusic"
Result: pass
Notes: Read-only preflight passed for production health, signed-out landing,
signed-out dashboard redirect state, and GitHub deployment statuses. Vercel
status was added manually only after production health confirmed the deployed
main commit. Rerun `npm run smoke:preflight` after each production deployment
and record the current health commit before manual Apple Music smoke.
```

## Required Manual Evidence

Every row must be proven with current production evidence before the goal is
complete.

| Requirement | Required evidence | Current status |
| --- | --- | --- |
| Real user sign-in | Production app account signs in and reaches `/app`. | Not yet verified for platform-first smoke. |
| Apple Music connect | MusicKit authorizes the intended Apple Music account and `/api/apple/connection` reports connected without exposing token fields. | Not yet verified for platform-first smoke. |
| Library sync | A production sync completes through the worker; raw, normalized, duplicate, and owned-track counts are recorded. | Not yet verified for platform-first smoke. |
| Organize My Library | User clicks `Organize My Library` and creates a full-library Sort. | Not yet verified for platform-first smoke. |
| Three persistent playlists | Sort contains at least three app playlist plans with playlist-owned recipes. | Not yet verified for platform-first smoke. |
| Generation from existing library | Full organization generates proposed tracks from the synced Apple Music library. | Not yet verified for platform-first smoke. |
| Review every playlist and track | User reviews playlist-level selection and track-level keep/remove decisions. | Not yet verified for platform-first smoke. |
| Explicit Apple Music export | Export is manually confirmed after review; no write happens before confirmation. | Not yet verified for platform-first smoke. |
| Apple Music write-back | Worker creates Apple Music playlists and adds approved tracks; Apple playlist IDs are stored. | Not yet verified for platform-first smoke. |
| Playlist hub persistence | Exported app-created playlists appear in `/app/playlists` and playlist detail shows recipe, tracks, export status, and history. | Not yet verified for platform-first smoke. |
| One-off playlist flow | User creates or regenerates one playlist from `/app/playlists/new` or playlist detail without creating a Sort. | Not yet verified for platform-first smoke. |
| New-music processing | After a later sync, `Process New Music` creates review-only recommendations without duplicate queues or automatic Apple Music writes. | Not yet verified for platform-first smoke. |
| Security constraints | No token exposure in UI/logs; Apple private key remains server-only; user-owned data stays isolated. | Automated checks pass, but production smoke log review is still required. |
| Docs and known limitations | Smoke result, counts, partial failures, and Apple Music update limitations are recorded. | This evidence file is ready; no completed platform-first smoke result is recorded yet. |

## Manual Smoke Result Template

```text
Date:
Operator:
Production URL:
App user email:
Apple Music account label:
Health commit:
Worker commit/status:

Sign-in result:
Apple Music connection result:
Library sync id:
Raw track count:
Normalized track count:
Duplicate count:
Owned track count:

Sort id:
Playlist recipes:
- 
- 
- 

Generation ids:
Review changes made:
Export job id:
Apple playlist ids:
Apple Music verification:

Playlist hub verification:
One-off playlist id:
One-off generation id:
One-off export job id:

Second sync id:
New music processing result:
Duplicate queue check:

Logs reviewed:
Token/secret exposure check:
Smoke evidence command output:
Partial failures:
Known limitations:
Final result:
```

## Completion Rule

The platform-first MVP goal remains active until this file records a passing
manual smoke result for every required row above.
