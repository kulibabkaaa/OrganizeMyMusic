import type {
  GenreLabel,
  MoodLabel,
  NormalizedTrack,
  TrackClassification,
  TrackLanguage
} from "@/types/domain";

export interface TrackFeatureProfile {
  trackId: string;
  fingerprint: string;
  appleSongId: string | null;
  title: string;
  artist: string;
  album: string | null;
  genre: GenreLabel | null;
  language: TrackLanguage | null;
  moods: MoodLabel[];
  energy: number | null;
  explicit: boolean;
  year: number | null;
  confidence: number;
  classificationSource: TrackClassification["source"] | null;
  classificationVersion: number | null;
  hasClassification: boolean;
}

export function createTrackFeatureProfile(input: {
  track: NormalizedTrack;
  classification?: TrackClassification | null;
}): TrackFeatureProfile {
  const { track, classification } = input;

  return {
    trackId: track.id,
    fingerprint: track.fingerprint,
    appleSongId: track.appleSongId ?? null,
    title: track.name,
    artist: track.artistName,
    album: track.albumName ?? null,
    genre: classification?.genre ?? null,
    language: classification?.language ?? null,
    moods: classification?.moods ?? [],
    energy: normalizeUnitInterval(classification?.energy ?? null),
    explicit: track.contentRating === "explicit",
    year: null,
    confidence: normalizeUnitInterval(classification?.confidence ?? null) ?? 0,
    classificationSource: classification?.source ?? null,
    classificationVersion: classification?.version ?? null,
    hasClassification: Boolean(classification)
  };
}

export function createTrackFeatureProfiles(input: {
  tracks: NormalizedTrack[];
  classifications: TrackClassification[];
}): TrackFeatureProfile[] {
  const classificationsByFingerprint = new Map(
    input.classifications.map((classification) => [classification.fingerprint, classification])
  );

  return input.tracks.map((track) =>
    createTrackFeatureProfile({
      track,
      classification: classificationsByFingerprint.get(track.fingerprint) ?? null
    })
  );
}

function normalizeUnitInterval(value: number | null): number | null {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return Math.min(1, Math.max(0, value));
}
