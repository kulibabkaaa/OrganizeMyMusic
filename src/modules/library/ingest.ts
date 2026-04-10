import type { RawAppleTrack } from "@/types/domain";

import { dedupeTracks } from "@/modules/library/dedupe";
import { normalizeTrack } from "@/modules/library/normalize";

export interface IngestedLibrary {
  totalRawTracks: number;
  totalNormalizedTracks: number;
  duplicatesRemoved: number;
  tracks: ReturnType<typeof dedupeTracks>;
}

export function ingestLibrary(rawTracks: RawAppleTrack[]): IngestedLibrary {
  const normalizedTracks = rawTracks.map(normalizeTrack);
  const dedupedTracks = dedupeTracks(normalizedTracks);

  return {
    totalRawTracks: rawTracks.length,
    totalNormalizedTracks: dedupedTracks.length,
    duplicatesRemoved: rawTracks.length - dedupedTracks.length,
    tracks: dedupedTracks
  };
}

