import { describe, expect, it } from "vitest";

import { createReviewSnapshotFromStoredPlaylists } from "@/modules/sorts/full-sort-job";

describe("full sort review result", () => {
  it("reconstructs the review snapshot from stored generated playlists", () => {
    expect(
      createReviewSnapshotFromStoredPlaylists({
        sortRunId: "sort_1",
        librarySyncId: "sync_1",
        generatedAt: "2026-05-26T12:00:00.000Z",
        playlists: [
          {
            id: "stored_playlist_1",
            dimension: "request",
            title: "Gym rap",
            description: "Generated from your request.",
            confidenceLabel: "high",
            playlistRules: {
              generatedPlaylistId: "request_gym_rap",
              qualityWarnings: ["Only 1 track matched this request."]
            },
            tracks: [
              {
                fingerprint: "fp_1",
                normalizedTrackId: "track_1",
                appleSongId: "apple_1",
                name: "Track One",
                artistName: "Artist One",
                albumName: "Album One",
                position: 0,
                score: 0.91,
                reason: "genre Hip-Hop/Rap"
              }
            ]
          }
        ]
      })
    ).toEqual({
      sortRunId: "sort_1",
      librarySyncId: "sync_1",
      generatedAt: "2026-05-26T12:00:00.000Z",
      playlists: [
        {
          id: "request_gym_rap",
          dimension: "request",
          title: "Gym rap",
          description: "Generated from your request.",
          confidenceLabel: "high",
          trackCount: 1,
          trackFingerprints: ["fp_1"],
          appleSongIds: ["apple_1"],
          tracks: [
            {
              fingerprint: "fp_1",
              normalizedTrackId: "track_1",
              appleSongId: "apple_1",
              name: "Track One",
              artistName: "Artist One",
              albumName: "Album One",
              position: 0,
              score: 0.91,
              reason: "genre Hip-Hop/Rap"
            }
          ],
          qualityWarnings: ["Only 1 track matched this request."]
        }
      ]
    });
  });
});
