import { describe, expect, it } from "vitest";

import type { PreviewSnapshot } from "@/modules/sorts/preview-snapshot";
import {
  createInitialPreviewSelection,
  removePreviewTrack,
  summarizePreviewSelection,
  togglePreviewPlaylist
} from "@/modules/sorts/preview-selection";

const previewSnapshot: PreviewSnapshot = {
  sortRunId: "sort_1",
  librarySyncId: "sync_1",
  generatedAt: "2026-05-22T20:00:00.000Z",
  playlists: [
    {
      id: "playlist_1",
      dimension: "request",
      title: "Ukrainian Rap",
      description: "Tracks matching Ukrainian rap.",
      confidenceLabel: "high",
      trackCount: 2,
      trackFingerprints: ["fp_1", "fp_2"],
      appleSongIds: ["apple_1", "apple_2"],
      tracks: [
        {
          fingerprint: "fp_1",
          normalizedTrackId: "track_1",
          appleSongId: "apple_1",
          name: "Kyiv Bars",
          artistName: "Artist A",
          albumName: "Album A",
          position: 1,
          score: 0.95,
          reason: "Matched language and genre."
        },
        {
          fingerprint: "fp_2",
          normalizedTrackId: "track_2",
          appleSongId: "apple_2",
          name: "Dnipro Flow",
          artistName: "Artist B",
          albumName: "Album B",
          position: 2,
          score: 0.82,
          reason: "Matched genre."
        }
      ]
    },
    {
      id: "playlist_2",
      dimension: "request",
      title: "Gym Rap",
      description: "Tracks matching workout rap.",
      confidenceLabel: "medium",
      trackCount: 1,
      trackFingerprints: ["fp_3"],
      appleSongIds: ["apple_3"],
      tracks: [
        {
          fingerprint: "fp_3",
          normalizedTrackId: "track_3",
          appleSongId: "apple_3",
          name: "Lift",
          artistName: "Artist C",
          albumName: "Album C",
          position: 1,
          score: 0.78,
          reason: "Matched mood and energy."
        }
      ]
    }
  ]
};

describe("preview selection", () => {
  it("selects every generated playlist by default", () => {
    const selection = createInitialPreviewSelection(previewSnapshot);

    expect(summarizePreviewSelection(previewSnapshot, selection)).toEqual({
      selectedPlaylistCount: 2,
      selectedTrackCount: 3
    });
  });

  it("allows whole playlists and individual tracks to be excluded locally", () => {
    const initialSelection = createInitialPreviewSelection(previewSnapshot);
    const withoutPlaylist = togglePreviewPlaylist(initialSelection, "playlist_2");
    const withoutTrack = removePreviewTrack(withoutPlaylist, "playlist_1", "fp_1");

    expect(summarizePreviewSelection(previewSnapshot, withoutTrack)).toEqual({
      selectedPlaylistCount: 1,
      selectedTrackCount: 1
    });
  });
});
