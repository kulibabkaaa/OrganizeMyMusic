import { describe, expect, it } from "vitest";

import { summarizeLatestSortRun } from "@/modules/sorts/latest-run";

describe("latest sort run summary", () => {
  it("summarizes aggregate sort run state without track-level data", () => {
    const summary = summarizeLatestSortRun({
      sortRun: {
        id: "sort_1",
        state: "completed",
        payment_status: "pending",
        created_at: "2026-05-23T14:27:08.000Z",
        updated_at: "2026-05-23T14:30:08.000Z"
      },
      playlists: [
        {
          id: "playlist_1",
          selected: true,
          apple_playlist_id: "apple_playlist_1"
        },
        {
          id: "playlist_2",
          selected: false,
          apple_playlist_id: null
        }
      ],
      playlistTracks: [{ id: "assignment_1" }, { id: "assignment_2" }]
    });

    expect(summary).toEqual({
      id: "sort_1",
      state: "completed",
      paymentStatus: "pending",
      createdAt: "2026-05-23T14:27:08.000Z",
      updatedAt: "2026-05-23T14:30:08.000Z",
      playlistCount: 2,
      selectedPlaylistCount: 1,
      applePlaylistIdCount: 1,
      trackAssignmentCount: 2
    });
    expect(JSON.stringify(summary)).not.toContain("track name");
    expect(JSON.stringify(summary)).not.toContain("apple song");
  });
});
