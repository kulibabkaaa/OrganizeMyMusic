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

  for (const track of tracks) {
    const existing = groups.get(track.fingerprint) ?? [];
    existing.push(track);
    groups.set(track.fingerprint, existing);
  }

  return Array.from(groups.values()).map((group) =>
    group.sort((a, b) => scoreTrack(b) - scoreTrack(a))[0]
  );
}

