import type { RawAppleTrack, SortRunSummary } from "@/types/domain";

import { classifyTracks } from "@/modules/classification/batch-classify";
import { ingestLibrary } from "@/modules/library/ingest";
import { generatePlaylists } from "@/modules/sorts/playlist-rules";

export async function generatePreviewFromRawTracks(rawTracks: RawAppleTrack[]): Promise<SortRunSummary> {
  const ingested = ingestLibrary(rawTracks);
  const classifications = await classifyTracks(ingested.tracks);
  const playlists = generatePlaylists(ingested.tracks, classifications);
  const now = new Date().toISOString();

  return {
    id: `sort_${Date.now()}`,
    state: "preview_ready",
    paymentStatus: "pending",
    previewPrice: 1900,
    createdAt: now,
    updatedAt: now,
    selectedPlaylistIds: playlists.map((playlist) => playlist.id),
    playlists
  };
}

