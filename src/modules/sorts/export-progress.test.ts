import { describe, expect, it } from "vitest";

import {
  getExportProgress,
  summarizeExportTotals,
  type SortExportSummary
} from "@/modules/sorts/export-progress";

const exportingSummary: SortExportSummary = {
  sortId: "sort_1",
  sortName: "My Apple Music cleanup",
  state: "creating_playlists",
  updatedAt: "2026-05-26T12:30:00.000Z",
  playlists: [
    {
      id: "playlist_1",
      title: "Sad late-night songs",
      trackCount: 12,
      applePlaylistId: "apple_playlist_1",
      appleMusicUrl: null
    },
    {
      id: "playlist_2",
      title: "Indie commute",
      trackCount: 8,
      applePlaylistId: null,
      appleMusicUrl: null
    }
  ]
};

describe("export progress", () => {
  it("derives live exporting steps from created Apple playlist IDs", () => {
    const progress = getExportProgress(exportingSummary);

    expect(progress.percent).toBe(50);
    expect(progress.currentStep).toBe("Adding tracks");
    expect(progress.steps.map((step) => [step.label, step.status])).toEqual([
      ["Creating playlists", "done"],
      ["Adding tracks", "live"],
      ["Finalizing", "pending"],
      ["Done", "pending"]
    ]);
  });

  it("marks completed exports done and summarizes created playlists exactly", () => {
    const completedSummary: SortExportSummary = {
      ...exportingSummary,
      state: "completed",
      playlists: exportingSummary.playlists.map((playlist) => ({
        ...playlist,
        applePlaylistId: playlist.applePlaylistId ?? "apple_playlist_2"
      }))
    };

    expect(getExportProgress(completedSummary)).toMatchObject({
      percent: 100,
      currentStep: "Done"
    });
    expect(summarizeExportTotals(completedSummary)).toEqual({
      createdPlaylistCount: 2,
      totalTrackCount: 20
    });
  });
});
