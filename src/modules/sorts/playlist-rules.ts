import type { GeneratedPlaylist, MoodLabel, NormalizedTrack, PlaylistDimension, TrackClassification } from "@/types/domain";

const MIN_TRACKS_PER_PLAYLIST = 12;
const MAX_PLAYLISTS = 10;

type GroupKey = string;
interface GroupedTrack {
  fingerprint: string;
  appleSongId?: string;
}

function bucketTracksBy(
  dimension: PlaylistDimension,
  tracks: NormalizedTrack[],
  classifications: TrackClassification[]
) {
  const buckets = new Map<GroupKey, GroupedTrack[]>();

  for (const track of tracks) {
    const classification = classifications.find((item) => item.fingerprint === track.fingerprint);
    if (!classification) {
      continue;
    }

    const values =
      dimension === "language"
        ? [classification.language]
        : dimension === "genre"
          ? [classification.genre]
          : classification.moods;

    for (const value of values) {
      const existing = buckets.get(value) ?? [];
      existing.push({
        fingerprint: track.fingerprint,
        appleSongId: track.appleSongId
      });
      buckets.set(value, existing);
    }
  }

  return buckets;
}

function titleForBucket(dimension: PlaylistDimension, key: string) {
  if (dimension === "language") {
    return `${key[0]?.toUpperCase() ?? ""}${key.slice(1)} Favorites`;
  }

  if (dimension === "genre") {
    return `${key} Essentials`;
  }

  return key === "Feel-Good" ? "Feel-Good Rotation" : `${key} Mix`;
}

export function generatePlaylists(tracks: NormalizedTrack[], classifications: TrackClassification[]) {
  const dimensions: PlaylistDimension[] = ["language", "genre", "mood"];
  const playlists: GeneratedPlaylist[] = [];

  for (const dimension of dimensions) {
    const buckets = bucketTracksBy(dimension, tracks, classifications);

    for (const [key, trackFingerprints] of buckets.entries()) {
      if (trackFingerprints.length < MIN_TRACKS_PER_PLAYLIST || key === "unknown") {
        continue;
      }

      playlists.push({
        id: `${dimension}_${key.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        dimension,
        title: titleForBucket(dimension, key),
        description:
          dimension === "mood"
            ? "A confidence-scored mood cut ready for Apple Music playlist creation."
            : `Generated from your ${dimension} cluster after normalization and dedupe.`,
        confidenceLabel: dimension === "mood" ? "medium" : "high",
        trackCount: trackFingerprints.length,
        trackFingerprints: trackFingerprints.map((item) => item.fingerprint),
        appleSongIds: trackFingerprints
          .map((item) => item.appleSongId)
          .filter((value): value is string => Boolean(value))
      });
    }
  }

  return playlists
    .sort((a, b) => b.trackCount - a.trackCount)
    .slice(0, MAX_PLAYLISTS);
}

export function summarizeMoodCoverage(playlists: GeneratedPlaylist[]) {
  return playlists
    .filter((playlist) => playlist.dimension === "mood")
    .map((playlist) => playlist.title) as MoodLabel[];
}
