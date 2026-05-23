import type { ParsedPlaylistRequest } from "@/modules/playlist-requests/parser";
import type {
  GeneratedPlaylist,
  GeneratedPlaylistMatchStats,
  GeneratedPlaylistTrack,
  MoodLabel,
  NormalizedTrack,
  PlaylistDimension,
  TrackClassification
} from "@/types/domain";

const MIN_TRACKS_PER_PLAYLIST = 12;
const LOW_MATCH_TRACK_COUNT = 5;
const MAX_PLAYLISTS = 10;
const MIN_REQUEST_SCORE = 0.45;

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
          .filter((value): value is string => Boolean(value)),
        tracks: trackFingerprints.map((item, index) => ({
          fingerprint: item.fingerprint,
          appleSongId: item.appleSongId,
          name: undefined,
          artistName: undefined,
          albumName: undefined,
          position: index,
          score: 1,
          reason: `Grouped by ${dimension} match.`
        }))
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

function clampScore(score: number) {
  return Math.min(1, Math.max(0, Number(score.toFixed(3))));
}

function createEmptyMatchStats(totalTrackCount: number): GeneratedPlaylistMatchStats {
  return {
    totalTrackCount,
    classifiedTrackCount: 0,
    missingClassificationCount: totalTrackCount,
    matchedTrackCount: 0,
    rejectedExplicitCount: 0,
    rejectedLanguageCount: 0,
    rejectedGenreCount: 0,
    rejectedMoodCount: 0,
    rejectedEnergyCount: 0,
    belowScoreCount: 0
  };
}

type RequestScoreResult =
  | {
      status: "matched";
      track: Omit<GeneratedPlaylistTrack, "position">;
    }
  | {
      status: "rejected";
      reason:
        | "explicit"
        | "language"
        | "genre"
        | "mood"
        | "energy"
        | "below_score";
    };

function scoreTrackForRequest(input: {
  track: NormalizedTrack;
  classification: TrackClassification;
  request: ParsedPlaylistRequest;
}): RequestScoreResult {
  const { track, classification, request } = input;
  const rules = request.parsedRules;
  let score = 0;
  const reasons: string[] = [];
  let genreMismatch = false;
  let moodMismatch = false;
  let energyMismatch = false;

  if (rules.excludeExplicit && track.contentRating === "explicit") {
    return { status: "rejected", reason: "explicit" };
  }

  if (rules.languages.length > 0 && !rules.languages.includes(classification.language)) {
    return { status: "rejected", reason: "language" };
  }

  if (rules.languages.length > 0) {
    score += 0.4;
    reasons.push(`language ${classification.language}`);
  }

  if (rules.genres.length > 0 && rules.genres.includes(classification.genre)) {
    score += 0.35;
    reasons.push(`genre ${classification.genre}`);
  } else if (rules.genres.length > 0) {
    genreMismatch = true;
  }

  const matchingSubgenres = rules.subgenres.filter((subgenre) =>
    classification.subgenres.some((candidate) => candidate.toLowerCase() === subgenre.toLowerCase())
  );

  if (matchingSubgenres.length > 0) {
    score += 0.15;
    reasons.push(`subgenre ${matchingSubgenres.join(", ")}`);
  }

  const matchingMoods = rules.moods.filter((mood) => classification.moods.includes(mood));

  if (matchingMoods.length > 0) {
    score += Math.min(0.24, matchingMoods.length * 0.12);
    reasons.push(`mood ${matchingMoods.join(", ")}`);
  } else if (rules.moods.length > 0) {
    moodMismatch = true;
  }

  const hasEnergyRule = rules.energyMin !== null || rules.energyMax !== null;
  const energyMatches =
    classification.energy !== null &&
    hasEnergyRule &&
    (rules.energyMin === null || classification.energy >= rules.energyMin) &&
    (rules.energyMax === null || classification.energy <= rules.energyMax);

  if (energyMatches) {
    score += 0.1;
    reasons.push("energy range");
  } else if (hasEnergyRule) {
    energyMismatch = true;
  }

  if (score < MIN_REQUEST_SCORE) {
    return {
      status: "rejected",
      reason: genreMismatch
        ? "genre"
        : moodMismatch
          ? "mood"
          : energyMismatch
            ? "energy"
            : "below_score"
    };
  }

  return {
    status: "matched",
    track: {
      fingerprint: track.fingerprint,
      normalizedTrackId: track.id,
      appleSongId: track.appleSongId,
      name: track.name,
      artistName: track.artistName,
      albumName: track.albumName,
      score: clampScore(score * classification.confidence),
      reason: reasons.join("; ")
    }
  };
}

function updateRejectionStats(
  stats: GeneratedPlaylistMatchStats,
  reason: Exclude<RequestScoreResult, { status: "matched" }>["reason"]
) {
  if (reason === "explicit") {
    stats.rejectedExplicitCount += 1;
  } else if (reason === "language") {
    stats.rejectedLanguageCount += 1;
  } else if (reason === "genre") {
    stats.rejectedGenreCount += 1;
  } else if (reason === "mood") {
    stats.rejectedMoodCount += 1;
  } else if (reason === "energy") {
    stats.rejectedEnergyCount += 1;
  } else {
    stats.belowScoreCount += 1;
  }
}

function qualityWarningsForMatchedCount(matchedTrackCount: number) {
  if (matchedTrackCount === 0) {
    return ["No tracks matched this request. It is excluded by default."];
  }

  if (matchedTrackCount < LOW_MATCH_TRACK_COUNT) {
    return [`Only ${matchedTrackCount} track${matchedTrackCount === 1 ? "" : "s"} matched this request. Review before confirming.`];
  }

  return [];
}

export function generateRequestedPlaylists(input: {
  requests: ParsedPlaylistRequest[];
  tracks: NormalizedTrack[];
  classifications: TrackClassification[];
}) {
  const classificationsByFingerprint = new Map(
    input.classifications.map((classification) => [classification.fingerprint, classification])
  );
  const playlists: GeneratedPlaylist[] = [];

  for (const request of input.requests) {
    const matchStats = createEmptyMatchStats(input.tracks.length);
    const tracks = input.tracks
      .flatMap((track) => {
        const classification = classificationsByFingerprint.get(track.fingerprint);

        if (!classification) {
          return [];
        }

        matchStats.classifiedTrackCount += 1;
        matchStats.missingClassificationCount -= 1;

        const scored = scoreTrackForRequest({ track, classification, request });

        if (scored.status === "matched") {
          matchStats.matchedTrackCount += 1;
          return [scored.track];
        }

        updateRejectionStats(matchStats, scored.reason);
        return [];
      })
      .sort((a, b) => b.score - a.score)
      .map((track, position) => ({
        ...track,
        position
      }));

    playlists.push({
      id: `request_${request.parsedRules.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
      dimension: "request",
      title: request.parsedRules.title,
      description:
        tracks.length === 0
          ? `No matching tracks were found for your request: ${request.userPrompt}.`
          : `Generated from your request: ${request.userPrompt}.`,
      confidenceLabel: tracks[0]?.score && tracks[0].score >= 0.75 ? "high" : "medium",
      trackCount: tracks.length,
      trackFingerprints: tracks.map((track) => track.fingerprint),
      appleSongIds: tracks
        .map((track) => track.appleSongId)
        .filter((value): value is string => Boolean(value)),
      tracks,
      qualityWarnings: qualityWarningsForMatchedCount(tracks.length),
      matchStats
    });
  }

  return playlists;
}
