# Project Brief

## Product name

OrganizeMyMusic

## Core idea

A web app that connects to a user's Apple Music library, analyzes their existing saved tracks, proposes better playlists, shows the user the exact planned output, and writes the confirmed playlists back into their Apple Music account.

## MVP focus

Apple Music only.

Spotify and YouTube Music are intentionally excluded from the MVP. They should be treated as future provider integrations after the Apple Music pipeline works end-to-end.

## Target user

A user with a messy Apple Music library who wants practical playlists without manually sorting hundreds or thousands of tracks.

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
6. Let the user describe or select desired playlists.
7. Generate proposed playlists from the user's existing tracks.
8. Show the user the playlists and included tracks before writing anything.
9. Let the user approve, edit, or reject the proposed output.
10. Create approved playlists in Apple Music.

## MVP definition

The MVP is complete when one real user can:

1. Sign up or sign in.
2. Connect Apple Music.
3. Sync at least 500 saved library tracks.
4. Request at least three custom playlists.
5. See a preview with track names, artists, playlist names, and track counts.
6. Confirm the preview.
7. Have the playlists created in their real Apple Music account.
8. See completion status and any errors.

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
- The codebase is structured so Spotify and YouTube Music can be added later without rewriting the whole app.

## Product principle

The app should behave like an organizer, not a chatbot.

AI is used to classify and plan. The user should interact with a clear product interface, not with an unpredictable open-ended assistant.
