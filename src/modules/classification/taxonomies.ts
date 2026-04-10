import type { GenreLabel, MoodLabel, TrackLanguage } from "@/types/domain";

export const CLASSIFICATION_VERSION = 1;

export const supportedLanguages: TrackLanguage[] = [
  "english",
  "spanish",
  "french",
  "german",
  "japanese",
  "korean",
  "portuguese",
  "instrumental",
  "unknown"
];

export const supportedGenres: GenreLabel[] = [
  "Pop",
  "Hip-Hop/Rap",
  "Rock",
  "R&B/Soul",
  "Electronic",
  "Indie/Alternative",
  "Latin",
  "Country",
  "Jazz",
  "Classical",
  "Metal",
  "Folk/Acoustic",
  "K-Pop",
  "J-Pop",
  "Gospel/Christian",
  "Reggae",
  "Soundtrack",
  "Other"
];

export const supportedMoods: MoodLabel[] = [
  "Chill",
  "Hype",
  "Focus",
  "Sad",
  "Romantic",
  "Workout",
  "Feel-Good",
  "Melancholy"
];

