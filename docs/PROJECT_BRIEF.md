# Project Brief

## Product name

OrganizeMyMusic

## Core idea

A web app that connects to a user's Apple Music library, analyzes their existing saved tracks, lets them create reusable Sorts with Playlist Recipes, previews likely output, and writes reviewed playlists back into their Apple Music account only after explicit export confirmation.

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
8. Show the user a lightweight preview before payment.
9. Unlock a specific Sort with payment when payment is enabled.
10. Let the user review, edit, or reject the generated output.
11. Create reviewed playlists in Apple Music only after explicit export.

## MVP definition

The MVP is complete when one real user can:

1. Sign up or sign in.
2. Connect Apple Music.
3. Sync at least 500 saved library tracks.
4. Request at least three custom playlists, or create at least three Playlist Recipes once the platform UI is implemented.
5. See a preview with playlist names, sample or full track rows, and track counts.
6. Review the generated output.
7. Explicitly export the reviewed playlists.
8. Have the playlists created in their real Apple Music account.
9. See completion status and any errors.

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
- The app treats payment as an unlock for one Sort, not as a required signup or connection step.
- The app can recover from failed sync/classification/write-back jobs.
- The generated playlists are plausible enough that the user keeps at least some of them.
- The codebase is structured so Spotify and YouTube Music can be added later without rewriting the whole app.

## Product principle

The app should behave like an organizer, not a chatbot.

AI is used to classify and plan. The user should interact with a clear product interface, not with an unpredictable open-ended assistant.
