export const schemaNotes = {
  profiles: "Application user profile and admin flag.",
  apple_music_connections: "Encrypted Apple user token, storefront, and validity metadata.",
  library_syncs: "Each ingestion attempt and its counters.",
  library_tracks_raw: "Raw Apple Music payloads for replay and debugging.",
  tracks_normalized: "Canonical deduped records keyed by fingerprint.",
  track_ownership: "Relationship between a user sync and normalized tracks.",
  track_classifications: "Language, genre, mood labels plus provenance.",
  sort_runs: "Lifecycle for preview, payment, and Apple playlist fulfillment.",
  sort_playlists: "Generated or created playlists attached to a sort run.",
  sort_playlist_tracks: "Track membership and rank for generated playlists.",
  payments: "Stripe checkout and fulfillment status.",
  job_events: "Structured logs for support and retries."
} as const;

