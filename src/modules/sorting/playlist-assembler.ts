import type { CompiledPlaylistRules } from "@/modules/sorting/rule-compiler";
import type { TrackScoringResult } from "@/modules/sorting/scoring";
import type { GeneratedPlaylistTrack } from "@/types/domain";

export interface PlaylistAssemblyInput {
  rules: CompiledPlaylistRules;
  candidates: TrackScoringResult[];
}

export interface AssembledPlaylist {
  recipeId: string;
  title: string;
  tracks: GeneratedPlaylistTrack[];
  qualityWarnings: string[];
  availableCandidateCount: number;
  skippedDuplicateCount: number;
  targetTrackMin: number | null;
  targetTrackMax: number | null;
}

type MatchedCandidate = Extract<TrackScoringResult, { status: "matched" }>;

const ARTIST_DIVERSITY_PENALTY = 0.16;
const ALBUM_DIVERSITY_PENALTY = 0.08;
const MIN_TRACKS_FOR_DIVERSITY_WARNING = 4;

export function assemblePlaylist(input: PlaylistAssemblyInput): AssembledPlaylist {
  return assemblePlaylistWithUsedFingerprints(input, new Set()).playlist;
}

export function assemblePlaylists(inputs: PlaylistAssemblyInput[]): AssembledPlaylist[] {
  const usedFingerprints = new Set<string>();

  return inputs.map((input) => {
    const { playlist, selectedFingerprints } = assemblePlaylistWithUsedFingerprints(
      input,
      usedFingerprints
    );

    for (const fingerprint of selectedFingerprints) {
      usedFingerprints.add(fingerprint);
    }

    return playlist;
  });
}

function assemblePlaylistWithUsedFingerprints(
  input: PlaylistAssemblyInput,
  usedFingerprints: Set<string>
): {
  playlist: AssembledPlaylist;
  selectedFingerprints: string[];
} {
  const matchedCandidates = sortMatchedCandidates(input.candidates);
  const duplicateAwareCandidates =
    input.rules.duplicatePolicy === "avoid_duplicates"
      ? matchedCandidates.filter((candidate) => !usedFingerprints.has(candidate.profile.fingerprint))
      : matchedCandidates;
  const skippedDuplicateCount = matchedCandidates.length - duplicateAwareCandidates.length;
  const targetMax = input.rules.targetTrackMax ?? duplicateAwareCandidates.length;
  const selectedCandidates = selectDiverseCandidates(duplicateAwareCandidates, targetMax);
  const tracks = selectedCandidates.map(toGeneratedPlaylistTrack);
  const qualityWarnings = createAssemblyWarnings({
    rules: input.rules,
    selectedTrackCount: tracks.length,
    availableCandidateCount: duplicateAwareCandidates.length,
    skippedDuplicateCount,
    selectedCandidates,
    availableCandidates: duplicateAwareCandidates
  });

  return {
    playlist: {
      recipeId: input.rules.recipeId,
      title: input.rules.title,
      tracks,
      qualityWarnings,
      availableCandidateCount: duplicateAwareCandidates.length,
      skippedDuplicateCount,
      targetTrackMin: input.rules.targetTrackMin,
      targetTrackMax: input.rules.targetTrackMax
    },
    selectedFingerprints: selectedCandidates.map((candidate) => candidate.profile.fingerprint)
  };
}

function sortMatchedCandidates(candidates: TrackScoringResult[]) {
  return candidates
    .filter((candidate): candidate is Extract<TrackScoringResult, { status: "matched" }> =>
      candidate.status === "matched"
    )
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.profile.fingerprint.localeCompare(b.profile.fingerprint);
    });
}

function selectDiverseCandidates(
  candidates: MatchedCandidate[],
  targetMax: number
): MatchedCandidate[] {
  const selected: MatchedCandidate[] = [];
  const remaining = candidates.slice();

  while (selected.length < targetMax && remaining.length > 0) {
    const nextCandidate = remaining
      .slice()
      .sort((a, b) => compareDiversityRank(a, b, selected))[0];

    if (!nextCandidate) {
      break;
    }

    selected.push(nextCandidate);
    remaining.splice(remaining.indexOf(nextCandidate), 1);
  }

  return selected;
}

function compareDiversityRank(
  left: MatchedCandidate,
  right: MatchedCandidate,
  selected: MatchedCandidate[]
) {
  const leftAdjustedScore = diversityAdjustedScore(left, selected);
  const rightAdjustedScore = diversityAdjustedScore(right, selected);

  if (rightAdjustedScore !== leftAdjustedScore) {
    return rightAdjustedScore - leftAdjustedScore;
  }

  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return left.profile.fingerprint.localeCompare(right.profile.fingerprint);
}

function diversityAdjustedScore(
  candidate: MatchedCandidate,
  selected: MatchedCandidate[]
) {
  const artistKey = normalizeDiversityKey(candidate.profile.artist);
  const albumKey = normalizeDiversityKey(candidate.profile.album);
  const selectedArtistCount = selected.filter(
    (item) => normalizeDiversityKey(item.profile.artist) === artistKey
  ).length;
  const selectedAlbumCount = albumKey
    ? selected.filter((item) => normalizeDiversityKey(item.profile.album) === albumKey).length
    : 0;

  return Number(
    (
      candidate.score -
      selectedArtistCount * ARTIST_DIVERSITY_PENALTY -
      selectedAlbumCount * ALBUM_DIVERSITY_PENALTY
    ).toFixed(3)
  );
}

function toGeneratedPlaylistTrack(
  candidate: MatchedCandidate,
  position: number
): GeneratedPlaylistTrack {
  return {
    fingerprint: candidate.profile.fingerprint,
    normalizedTrackId: candidate.profile.trackId,
    appleSongId: candidate.profile.appleSongId ?? undefined,
    name: candidate.profile.title,
    artistName: candidate.profile.artist,
    albumName: candidate.profile.album ?? undefined,
    position,
    score: candidate.score,
    reason: candidate.explanations.join("; ")
  };
}

function createAssemblyWarnings(input: {
  rules: CompiledPlaylistRules;
  selectedTrackCount: number;
  availableCandidateCount: number;
  skippedDuplicateCount: number;
  selectedCandidates: MatchedCandidate[];
  availableCandidates: MatchedCandidate[];
}) {
  const warnings: string[] = [];

  if (
    input.rules.targetTrackMin !== null &&
    input.selectedTrackCount < input.rules.targetTrackMin
  ) {
    warnings.push(
      `Only ${input.selectedTrackCount} track${input.selectedTrackCount === 1 ? "" : "s"} matched this playlist plan; target minimum is ${input.rules.targetTrackMin}.`
    );
  }

  if (
    input.rules.targetTrackMax !== null &&
    input.availableCandidateCount > input.rules.targetTrackMax
  ) {
    warnings.push(
      `Limited to the top ${input.rules.targetTrackMax} tracks by score.`
    );
  }

  if (input.skippedDuplicateCount > 0) {
    warnings.push(
      `${input.skippedDuplicateCount} duplicate candidate${input.skippedDuplicateCount === 1 ? "" : "s"} skipped because this playlist plan avoids repeats.`
    );
  }

  return [
    ...warnings,
    ...createDiversityWarnings(input.selectedCandidates, input.availableCandidates)
  ];
}

function createDiversityWarnings(
  selectedCandidates: MatchedCandidate[],
  availableCandidates: MatchedCandidate[]
) {
  if (selectedCandidates.length < MIN_TRACKS_FOR_DIVERSITY_WARNING) {
    return [];
  }

  const warnings: string[] = [];
  const artistCounts = countBy(
    selectedCandidates,
    (candidate) => candidate.profile.artist.trim() || "Unknown artist"
  );
  const albumCounts = countBy(
    selectedCandidates.filter((candidate) => candidate.profile.album),
    (candidate) => candidate.profile.album?.trim() || "Unknown album"
  );
  const maxArtist = maxEntry(artistCounts);
  const maxAlbum = maxEntry(albumCounts);
  const artistLimit = Math.max(2, Math.ceil(selectedCandidates.length * 0.5));
  const albumLimit = Math.max(2, Math.ceil(selectedCandidates.length * 0.4));

  if (
    maxArtist &&
    maxArtist.count > artistLimit &&
    uniqueCount(availableCandidates, (candidate) => normalizeDiversityKey(candidate.profile.artist)) > 1
  ) {
    warnings.push(
      `Artist diversity is limited: ${maxArtist.count}/${selectedCandidates.length} tracks are by ${maxArtist.label}.`
    );
  }

  if (
    maxAlbum &&
    maxAlbum.count > albumLimit &&
    uniqueCount(availableCandidates, (candidate) => normalizeDiversityKey(candidate.profile.album)) > 1
  ) {
    warnings.push(
      `Album diversity is limited: ${maxAlbum.count}/${selectedCandidates.length} tracks are from ${maxAlbum.label}.`
    );
  }

  return warnings;
}

function countBy<TItem>(items: TItem[], labelForItem: (item: TItem) => string) {
  const counts = new Map<string, { label: string; count: number }>();

  for (const item of items) {
    const label = labelForItem(item);
    const key = normalizeDiversityKey(label) ?? "__unknown__";
    const current = counts.get(key);

    counts.set(key, {
      label: current?.label ?? label,
      count: (current?.count ?? 0) + 1
    });
  }

  return counts;
}

function maxEntry(counts: Map<string, { label: string; count: number }>) {
  return Array.from(counts.values()).sort((a, b) => b.count - a.count)[0] ?? null;
}

function uniqueCount<TItem>(items: TItem[], keyForItem: (item: TItem) => string | null) {
  return new Set(items.map(keyForItem).filter((value): value is string => Boolean(value))).size;
}

function normalizeDiversityKey(value: string | null) {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";

  return normalized || null;
}
