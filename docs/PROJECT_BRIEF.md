# Project Brief

## Product name

OrganizeMyMusic

## Core idea

A web app that connects to a user's Apple Music library, organizes their existing saved tracks into useful playlists, stores those playlists as reusable app objects, and lets the user regenerate, review, and export approved updates back to Apple Music.

## MVP focus

Apple Music only.

Spotify and YouTube Music are intentionally excluded from the MVP. They should be treated as future provider integrations after the Apple Music pipeline works end-to-end.

## Target user

Casual listeners and music obsessives with messy Apple Music libraries who want practical playlists without manually sorting hundreds or thousands of tracks.

Example user need:

```text
I have 500 saved songs across many languages, genres, and moods.
I want playlists like Ukrainian Rap, Gym Rap, Sad Slavic Songs,
Chill Electronic, and Late Night Driving.
The app should figure out which existing tracks belong where,
show me the proposed playlists, then create them in Apple Music if I confirm.
```

## Core jobs to be done

1. Create an app account.
2. Connect Apple Music.
3. Sync saved Apple Music library tracks.
4. Normalize and dedupe tracks.
5. Classify tracks by metadata, language, genre, mood, and practical use case.
6. Let the user organize the whole library through a Sort.
7. Let the user create playlist objects inside that Sort.
8. Let the user define a simple recipe for each playlist.
9. Generate proposed tracks from the user's existing library.
10. Show the user playlists and included tracks before writing anything.
11. Let the user approve, edit, or reject every playlist and track.
12. Create approved playlists in Apple Music.
13. Persist playlists so the user can revisit, regenerate, and update them later.

## MVP definition

The MVP is complete when one real user can:

1. Sign up or sign in.
2. Connect Apple Music.
3. Sync at least 500 saved library tracks.
4. Click `Organize My Library`.
5. Create at least three playlists with recipes.
6. Generate proposed tracks from their existing library.
7. Review playlist names, artists, track counts, reasons, and every track.
8. Confirm the reviewed output.
9. Have the playlists created in their real Apple Music account.
10. See those playlists persist in the app dashboard.
11. See completion status and any errors.

## Non-goals for MVP

- Spotify integration.
- YouTube Music integration.
- Public playlist sharing.
- Collaborative playlists.
- Mobile app.
- Native iOS app.
- Custom-trained model.
- Automatic editing of existing user playlists.
- Complex subscription billing.
- Perfect genre taxonomy.
- Full music recommendation engine.
- Music discovery or recommendation beyond organizing the user's existing library.

## Success criteria

The MVP succeeds if:

- A real Apple Music user can complete the full flow without developer intervention.
- The app never writes to Apple Music before confirmation.
- The app can recover from failed sync/classification/write-back jobs.
- The generated playlists are plausible enough that the user keeps at least some of them.
- App-created playlists remain available for later review/regeneration.
- The codebase is structured so Spotify and YouTube Music can be added later without rewriting the whole app.

## Product principle

The app should behave like an organizer, not a chatbot.

AI is used to classify and plan. The user should interact with a clear product interface, not with an unpredictable open-ended assistant.

## Platform principle

`Sort` means a full-library organization project. The daily product surface is saved playlists with recipes, review history, and user-triggered regeneration.
