import type { NormalizedTrack } from "@/types/domain";

function scoreTrack(track: NormalizedTrack) {
  return [
    track.isrc ? 3 : 0,
    track.appleSongId ? 2 : 0,
    track.genreNames.length > 0 ? 1 : 0,
    track.albumName ? 1 : 0
  ].reduce((total, current) => total + current, 0);
}

export function dedupeTracks(tracks: NormalizedTrack[]) {
  const groups = new Map<string, NormalizedTrack[]>();
  const isrcCounts = new Map<string, number>();

  for (const track of tracks) {
    const isrc = track.isrc?.trim().toLowerCase();

    if (isrc) {
      isrcCounts.set(isrc, (isrcCounts.get(isrc) ?? 0) + 1);
    }
  }

  for (const track of tracks) {
    const isrc = track.isrc?.trim().toLowerCase();
    const dedupeKey = isrc && (isrcCounts.get(isrc) ?? 0) > 1
      ? `isrc:${isrc}`
      : `fingerprint:${track.fingerprint}`;
    const existing = groups.get(dedupeKey) ?? [];
    existing.push(track);
    groups.set(dedupeKey, existing);
  }

  return Array.from(groups.values()).map((group) =>
    group.sort((a, b) => scoreTrack(b) - scoreTrack(a))[0]
  );
}
