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
Partial failures:
Known limitations:
Final result:
```

## Completion Rule

The platform-first MVP goal remains active until this file records a passing
manual smoke result for every required row above.
