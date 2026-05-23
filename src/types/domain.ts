export type SortRunState =
  | "draft"
  | "syncing"
  | "classifying"
  | "preview_ready"
  | "awaiting_payment"
  | "paid"
  | "creating_playlists"
  | "completed"
  | "failed";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type AppleMusicConnectionStatus = "disconnected" | "connected" | "expired";

export type PlaylistDimension = "language" | "genre" | "mood" | "request";

export type TrackLanguage =
  | "english"
  | "ukrainian"
  | "russian"
  | "polish"
  | "spanish"
  | "french"
  | "german"
  | "japanese"
  | "korean"
  | "portuguese"
  | "instrumental"
  | "mixed"
  | "unknown";

export type GenreLabel =
  | "Pop"
  | "Hip-Hop/Rap"
  | "Rock"
  | "R&B/Soul"
  | "Electronic"
  | "Indie/Alternative"
  | "Latin"
  | "Country"
  | "Jazz"
  | "Classical"
  | "Metal"
  | "Folk/Acoustic"
  | "K-Pop"
  | "J-Pop"
  | "Gospel/Christian"
  | "Reggae"
  | "Soundtrack"
  | "Other";

export type MoodLabel =
  | "Chill"
  | "Hype"
  | "Focus"
  | "Sad"
  | "Romantic"
  | "Workout"
  | "Feel-Good"
  | "Melancholy"
  | "Dark"
  | "Party"
  | "Driving"
  | "Late-Night";

export interface RawAppleTrack {
  id: string;
  name: string;
  artistName: string;
  albumName?: string;
  durationInMillis?: number;
  genreNames?: string[];
  contentRating?: "clean" | "explicit";
  isrc?: string;
}

export interface NormalizedTrack {
  id: string;
  appleSongId?: string;
  name: string;
  artistName: string;
  albumName?: string;
  normalizedName: string;
  normalizedArtist: string;
  normalizedAlbum?: string;
  fingerprint: string;
  durationInMillis?: number;
  genreNames: string[];
  contentRating?: "clean" | "explicit";
  isrc?: string;
}

export interface TrackClassification {
  fingerprint: string;
  language: TrackLanguage;
  genre: GenreLabel;
  subgenres: string[];
  moods: MoodLabel[];
  energy: number | null;
  confidence: number;
  source: "metadata" | "heuristic" | "openai";
  version: number;
  metadataHash: string;
}

export interface GeneratedPlaylist {
  id: string;
  dimension: PlaylistDimension;
  title: string;
  description: string;
  confidenceLabel: "high" | "medium";
  trackCount: number;
  trackFingerprints: string[];
  appleSongIds: string[];
  tracks: GeneratedPlaylistTrack[];
}

export interface GeneratedPlaylistTrack {
  fingerprint: string;
  normalizedTrackId?: string;
  appleSongId?: string;
  name?: string;
  artistName?: string;
  albumName?: string;
  position: number;
  score: number;
  reason: string;
}

export interface SortRunSummary {
  id: string;
  state: SortRunState;
  paymentStatus: PaymentStatus;
  previewPrice: number;
  createdAt: string;
  updatedAt: string;
  selectedPlaylistIds: string[];
  playlists: GeneratedPlaylist[];
}

export interface JobEvent {
  id: string;
  sortRunId: string;
  stage: string;
  level: "info" | "warn" | "error";
  message: string;
  createdAt: string;
}
