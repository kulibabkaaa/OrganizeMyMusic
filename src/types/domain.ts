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

export type SortSourceProvider = "apple_music";

export type PlaylistDimension = "language" | "genre" | "mood" | "request";

export type PlaylistStatus = "draft" | "active" | "archived";

export type PlaylistGenerationStatus =
  | "generating"
  | "ready_for_review"
  | "reviewed"
  | "exporting"
  | "exported"
  | "failed";

export type PlaylistTrackDecision = "keep" | "remove";

export type PlaylistExportStatus = "queued" | "exporting" | "exported" | "failed";

export type PlaylistRecipeTagCategory =
  | "mood"
  | "genre"
  | "language"
  | "era"
  | "region"
  | "energy"
  | "activity"
  | "artist_style"
  | "custom";

export type PlaylistRecipeDuplicatePolicy = "avoid_duplicates" | "allow_duplicates";

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

export interface PersistentPlaylist {
  id: string;
  userId: string;
  sourceProvider: SortSourceProvider;
  name: string;
  description: string | null;
  status: PlaylistStatus;
  applePlaylistId: string | null;
  createdFromSortRunId: string | null;
  latestLibrarySyncId: string | null;
  lastGeneratedAt: string | null;
  lastExportedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface PlaylistRecipeTag {
  id: string;
  category: PlaylistRecipeTagCategory;
  value: string;
  note?: string;
}

export interface PlaylistRecipe {
  id: string;
  userId: string;
  sortRunId?: string | null;
  playlistId?: string | null;
  position: number;
  name: string;
  playlistNote: string | null;
  targetTrackMin: number | null;
  targetTrackMax: number | null;
  duplicatePolicy: PlaylistRecipeDuplicatePolicy;
  allowExplicit: boolean;
  includeLibraryOnly: boolean;
  tags: PlaylistRecipeTag[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistGeneration {
  id: string;
  userId: string;
  playlistId: string;
  recipeId: string | null;
  sortRunId: string | null;
  librarySyncId: string | null;
  status: PlaylistGenerationStatus;
  recipeSnapshot: Record<string, unknown>;
  errorSummary: string | null;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistGenerationTrack {
  id: string;
  generationId: string;
  normalizedTrackId: string;
  position: number;
  score: number | null;
  reason: string | null;
  decision: PlaylistTrackDecision;
  createdAt: string;
}

export interface PlaylistExport {
  id: string;
  userId: string;
  playlistId: string;
  generationId: string | null;
  sortRunId: string | null;
  applePlaylistId: string | null;
  status: PlaylistExportStatus;
  selectedTrackCount: number;
  errorSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedPlaylist {
  id: string;
  dimension: PlaylistDimension;
  title: string;
  description: string;
  confidenceLabel: "high" | "medium" | "low";
  trackCount: number;
  trackFingerprints: string[];
  appleSongIds: string[];
  tracks: GeneratedPlaylistTrack[];
  qualityWarnings?: string[];
  matchStats?: GeneratedPlaylistMatchStats;
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

export interface GeneratedPlaylistMatchStats {
  totalTrackCount: number;
  classifiedTrackCount: number;
  missingClassificationCount: number;
  matchedTrackCount: number;
  rejectedExplicitCount: number;
  rejectedLanguageCount: number;
  rejectedGenreCount: number;
  rejectedMoodCount: number;
  rejectedEnergyCount: number;
  belowScoreCount: number;
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
