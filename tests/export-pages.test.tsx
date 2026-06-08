import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ExportCompletePage } from "@/components/app/export/export-complete-page";
import { ExportingPage } from "@/components/app/export/exporting-page";
import type { SortExportSummary } from "@/modules/sorts/export-progress";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

const summary: SortExportSummary = {
  sortId: "sort_1",
  sortName: "My Apple Music cleanup",
  state: "completed",
  updatedAt: "2026-05-26T12:30:00.000Z",
  playlists: [
    {
      id: "playlist_1",
      title: "Sad late-night songs",
      trackCount: 12,
      applePlaylistId: "apple_playlist_1",
      appleMusicUrl: "https://music.apple.com/library/playlist/apple_playlist_1"
    },
    {
      id: "playlist_2",
      title: "Indie commute",
      trackCount: 8,
      applePlaylistId: "apple_playlist_2",
      appleMusicUrl: null
    }
  ]
};

describe("export pages", () => {
  it("renders refreshable exporting progress with all expected steps", () => {
    const markup = renderToStaticMarkup(
      <ExportingPage
        summary={{
          ...summary,
          state: "creating_playlists",
          playlists: [
            { ...summary.playlists[0], applePlaylistId: "apple_playlist_1" },
            { ...summary.playlists[1], applePlaylistId: null }
          ]
        }}
      />
    );

    expect(markup).toContain("Exporting to Apple Music");
    expect(markup).toContain("You can leave and return later.");
    expect(markup).toContain("This page can be refreshed while your reviewed playlists are created.");
    expect(markup).toContain("Creating playlists");
    expect(markup).toContain("Adding tracks");
    expect(markup).toContain("Finalizing");
    expect(markup).toContain("Done");
    expect(markup).toContain("Sad late-night songs");
    expect(markup).toContain("12 tracks");
    expect(markup).toContain("Back to dashboard");
    expect(markup).toContain("View all Sorts");
    expect(markup).toContain("/app/sorts");
    expect(markup).toContain("Export status auto-refresh every 3 seconds.");
  });

  it("renders exact export completion summary and optional Apple Music links", () => {
    const markup = renderToStaticMarkup(<ExportCompletePage summary={summary} />);

    expect(markup).toContain("Playlists created in Apple Music");
    expect(markup).toContain("Your reviewed playlists were created in Apple Music. Nothing else in your library was modified.");
    expect(markup).toContain("2 playlists created");
    expect(markup).toContain("20 tracks exported");
    expect(markup).toContain("Export timestamp");
    expect(markup).toContain("May 26, 2026");
    expect(markup).toContain("Sad late-night songs");
    expect(markup).toContain("Indie commute");
    expect(markup).toContain("Open Apple Music");
    expect(markup).toContain("Back to dashboard");
    expect(markup).toContain("View all Sorts");
    expect(markup).toContain("/app/sorts");
  });
});
