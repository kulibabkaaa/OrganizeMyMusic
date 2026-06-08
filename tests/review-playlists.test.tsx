import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ExportConfirmationDialog } from "@/components/app/review/export-confirmation-dialog";
import { GeneratedPlaylistList } from "@/components/app/review/generated-playlist-list";
import { PlaylistDetailsPanel } from "@/components/app/review/playlist-details-panel";
import { PlaylistTrackTable } from "@/components/app/review/playlist-track-table";
import { ReviewPlaylistsPage } from "@/components/app/review/review-playlists-page";
import {
  createInitialReviewSelection,
  deleteReviewPlaylist,
  getReviewPlaylistView,
  removeReviewTrack
} from "@/modules/sorts/review-selection";
import type { PreviewSnapshot } from "@/modules/sorts/preview-snapshot";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

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
      qualityWarnings: [
        "Top matches are low-confidence. Review the tags before starting the full Sort.",
        "1 duplicate candidate skipped because this playlist plan avoids repeats."
      ],
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
          reason: "mood Sad; activity Night"
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

const selection = createInitialReviewSelection(snapshot);
const selectedPlaylist = getReviewPlaylistView(snapshot.playlists[0], selection);

describe("review playlists page", () => {
  it("renders the three-panel review workspace and safety copy", () => {
    const markup = renderToStaticMarkup(
      <ReviewPlaylistsPage
        sortId="sort_1"
        sortName="My Apple Music cleanup"
        snapshot={snapshot}
      />
    );

    expect(markup).toContain("Review playlists");
    expect(markup).toContain("Generated playlists");
    expect(markup).toContain("Sad late-night songs");
    expect(markup).toContain("Indie commute");
    expect(markup).toContain("Track");
    expect(markup).toContain("Artist");
    expect(markup).toContain("Album");
    expect(markup).toContain("Reason included");
    expect(markup).toContain("Matched tags");
    expect(markup).toContain("Actions");
    expect(markup).toContain("Sorting warnings");
    expect(markup).toContain("Top matches are low-confidence. Review the tags before starting the full Sort.");
    expect(markup).toContain("Back to dashboard");
    expect(markup).toContain("View all Sorts");
    expect(markup).toContain("Export selected playlists");
    expect(countOccurrences(markup, "Export selected playlists")).toBe(1);
    expect(markup).not.toContain("Create playlists in Apple Music");
    expect(markup).not.toContain("Export all playlists");
    expect(markup).not.toContain("Export this playlist");
    expect(markup).not.toContain("Save for later");
    expect(markup).not.toContain("Regenerate playlist");
    expect(markup).not.toContain("Keep");
    expect(markup).toContain("Nothing is exported automatically. Existing Apple Music playlists will not be modified.");
  });

  it("renders generated playlist list, track table, details panel, and confirmation dialog", () => {
    expect(
      renderToStaticMarkup(
        <GeneratedPlaylistList
          playlists={snapshot.playlists}
          selection={selection}
          onSelect={() => undefined}
          onDelete={() => undefined}
          onRestore={() => undefined}
        />
      )
    ).toContain("2 tracks");

    const tableMarkup = renderToStaticMarkup(
      <PlaylistTrackTable
        playlist={selectedPlaylist}
        onRemoveTrack={() => undefined}
        onUndoRemoveTrack={() => undefined}
      />
    );
    expect(tableMarkup).toContain("<caption");
    expect(tableMarkup).toContain("Tracks selected for Sad late-night songs");
    expect(tableMarkup).toContain('aria-label="Tracks selected for Sad late-night songs"');
    expect(tableMarkup).toContain("md:hidden");
    expect(tableMarkup).toContain("hidden overflow-x-auto md:block");
    expect(tableMarkup).toContain("min-h-11");
    expect(tableMarkup).toContain("Moon Song");
    expect(tableMarkup).toContain("Phoebe Bridgers");
    expect(tableMarkup).toContain("Punisher");
    expect(tableMarkup).toContain("mood Sad");
    expect(tableMarkup).toContain("Sorting warnings");
    expect(tableMarkup).toContain("1 duplicate candidate skipped because this playlist plan avoids repeats.");
    expect(tableMarkup).not.toContain("Keep");
    expect(tableMarkup).toContain("Remove");

    const panelMarkup = renderToStaticMarkup(
      <PlaylistDetailsPanel
        playlist={selectedPlaylist}
        summary={{ selectedPlaylistCount: 2, selectedTrackCount: 3 }}
        onRename={() => undefined}
        onDelete={() => undefined}
        onOpenExport={() => undefined}
      />
    );
    expect(panelMarkup).toContain("Rename playlist");
    expect(panelMarkup).not.toContain("Regenerate playlist");
    expect(panelMarkup).not.toContain("Regeneration stays disabled until full sorting jobs are reopened.");
    expect(panelMarkup).not.toContain("Save for later");
    expect(panelMarkup).toContain("Delete playlist");
    expect(panelMarkup).toContain("Export selected playlists");
    expect(countOccurrences(panelMarkup, "Export selected playlists")).toBe(1);
    expect(panelMarkup).not.toContain("Create playlists in Apple Music");
    expect(panelMarkup).not.toContain("Export all playlists");
    expect(panelMarkup).not.toContain("Export this playlist");

    const dialogMarkup = renderToStaticMarkup(
      <ExportConfirmationDialog
        isOpen
        summary={{ selectedPlaylistCount: 2, selectedTrackCount: 3 }}
        onClose={() => undefined}
      />
    );
    expect(dialogMarkup).toContain('tabindex="-1"');
    expect(dialogMarkup).toContain('aria-describedby="export-confirmation-description"');
    expect(dialogMarkup).toContain('role="dialog"');
    expect(dialogMarkup).toContain('aria-modal="true"');
    expect(dialogMarkup).toContain("Confirm Apple Music export");
    expect(dialogMarkup).toContain("Export 2 selected playlists to Apple Music?");
    expect(dialogMarkup).toContain("Export selected playlists");
    expect(dialogMarkup).toContain("Organize Your Music will create new Apple Music playlists only. Existing playlists will not be modified.");
    expect(dialogMarkup).not.toContain("Create playlists in Apple Music");
  });

  it("renders accessible disabled explanations in review details", () => {
    const panelMarkup = renderToStaticMarkup(
      <PlaylistDetailsPanel
        playlist={null}
        summary={{ selectedPlaylistCount: 0, selectedTrackCount: 0 }}
        onRename={() => undefined}
        onDelete={() => undefined}
        onOpenExport={() => undefined}
      />
    );

    expect(panelMarkup).toContain("playlist-details-disabled-reason");
    expect(panelMarkup).toContain("Select a generated playlist before renaming or deleting.");
    expect(panelMarkup).toContain("playlist-export-disabled-reason");
    expect(panelMarkup).toContain("Select at least one playlist before exporting to Apple Music.");
    expect(panelMarkup).toContain('aria-describedby="playlist-details-disabled-reason"');
    expect(panelMarkup).toContain('aria-describedby="playlist-export-disabled-reason"');
  });

  it("renders undo controls for removed review items", () => {
    const changedSelection = deleteReviewPlaylist(
      removeReviewTrack(selection, "playlist_1", "fp_1"),
      "playlist_2"
    );
    const changedPlaylist = getReviewPlaylistView(snapshot.playlists[0], changedSelection);
    const listMarkup = renderToStaticMarkup(
      <GeneratedPlaylistList
        playlists={snapshot.playlists}
        selection={changedSelection}
        onSelect={() => undefined}
        onDelete={() => undefined}
        onRestore={() => undefined}
      />
    );
    const tableMarkup = renderToStaticMarkup(
      <PlaylistTrackTable
        playlist={changedPlaylist}
        onRemoveTrack={() => undefined}
        onUndoRemoveTrack={() => undefined}
      />
    );

    expect(listMarkup).toContain("Deleted");
    expect(listMarkup).toContain("Removed from export. You can undo before exporting.");
    expect(listMarkup).toContain("Undo delete");
    expect(tableMarkup).toContain("1 track removed from this playlist.");
    expect(tableMarkup).toContain("Undo remove");
  });
});

function countOccurrences(value: string, search: string) {
  return value.split(search).length - 1;
}
