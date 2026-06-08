import { describe, expect, it } from "vitest";

import {
  createInitialReviewSelection,
  deleteReviewPlaylist,
  getMatchedTagsForReviewTrack,
  getReviewPlaylistView,
  removeReviewTrack,
  renameReviewPlaylist,
  restoreReviewPlaylist,
  summarizeReviewSelection,
  undoLastRemovedReviewTrack
} from "@/modules/sorts/review-selection";
import type { PreviewSnapshot } from "@/modules/sorts/preview-snapshot";

const snapshot: PreviewSnapshot = {
  sortRunId: "sort_1",
  librarySyncId: "sync_1",
  generatedAt: "2026-05-26T12:00:00.000Z",
  playlists: [
    {
      id: "playlist_1",
      dimension: "request",
      title: "Sad late-night songs",
      description: "Generated from your request.",
      confidenceLabel: "high",
      trackCount: 2,
      trackFingerprints: ["fp_1", "fp_2"],
      appleSongIds: ["apple_1", "apple_2"],
      tracks: [
        {
          fingerprint: "fp_1",
          normalizedTrackId: "track_1",
          appleSongId: "apple_1",
          name: "Moon Song",
          artistName: "Phoebe Bridgers",
          albumName: "Punisher",
          position: 0,
          score: 0.91,
          reason: "language english; mood Sad; energy range"
        },
        {
          fingerprint: "fp_2",
          normalizedTrackId: "track_2",
          appleSongId: "apple_2",
          name: "Cellophane",
          artistName: "FKA twigs",
          albumName: "Magdalene",
          position: 1,
          score: 0.87,
          reason: "mood Sad"
        }
      ]
    },
    {
      id: "playlist_2",
      dimension: "request",
      title: "Indie commute",
      description: "Generated from your request.",
      confidenceLabel: "medium",
      trackCount: 1,
      trackFingerprints: ["fp_3"],
      appleSongIds: ["apple_3"],
      tracks: [
        {
          fingerprint: "fp_3",
          normalizedTrackId: "track_3",
          appleSongId: "apple_3",
          name: "Kyoto",
          artistName: "Phoebe Bridgers",
          albumName: "Punisher",
          position: 0,
          score: 0.78,
          reason: "genre Indie/Alternative"
        }
      ]
    }
  ]
};

describe("review selection", () => {
  it("starts with every generated playlist and track selected for review", () => {
    const selection = createInitialReviewSelection(snapshot);

    expect(selection.selectedPlaylistId).toBe("playlist_1");
    expect(summarizeReviewSelection(snapshot, selection)).toEqual({
      selectedPlaylistCount: 2,
      selectedTrackCount: 3
    });
  });

  it("supports renaming playlists, deleting playlists, and removing tracks locally", () => {
    const selection = deleteReviewPlaylist(
      removeReviewTrack(
        renameReviewPlaylist(createInitialReviewSelection(snapshot), "playlist_1", "Late night edits"),
        "playlist_1",
        "fp_1"
      ),
      "playlist_2"
    );
    const playlist = getReviewPlaylistView(snapshot.playlists[0], selection);

    expect(playlist.title).toBe("Late night edits");
    expect(playlist.visibleTracks.map((track) => track.fingerprint)).toEqual(["fp_2"]);
    expect(playlist.removedTrackCount).toBe(1);
    expect(summarizeReviewSelection(snapshot, selection)).toEqual({
      selectedPlaylistCount: 1,
      selectedTrackCount: 1
    });
  });

  it("undoes removed tracks and deleted playlists before export", () => {
    const changedSelection = deleteReviewPlaylist(
      removeReviewTrack(createInitialReviewSelection(snapshot), "playlist_1", "fp_1"),
      "playlist_2"
    );

    expect(getReviewPlaylistView(snapshot.playlists[0], changedSelection)).toMatchObject({
      removedTrackCount: 1
    });
    expect(getReviewPlaylistView(snapshot.playlists[1], changedSelection)).toMatchObject({
      isIncluded: false
    });

    const restoredSelection = restoreReviewPlaylist(
      undoLastRemovedReviewTrack(changedSelection, "playlist_1"),
      "playlist_2"
    );

    expect(getReviewPlaylistView(snapshot.playlists[0], restoredSelection)).toMatchObject({
      removedTrackCount: 0
    });
    expect(getReviewPlaylistView(snapshot.playlists[1], restoredSelection)).toMatchObject({
      isIncluded: true
    });
    expect(summarizeReviewSelection(snapshot, restoredSelection)).toEqual({
      selectedPlaylistCount: 2,
      selectedTrackCount: 3
    });
  });

  it("derives matched tags from inclusion reasons without leaking raw library data", () => {
    expect(getMatchedTagsForReviewTrack(snapshot.playlists[0].tracks[0])).toEqual([
      "language english",
      "mood Sad",
      "energy range"
    ]);
  });
});
