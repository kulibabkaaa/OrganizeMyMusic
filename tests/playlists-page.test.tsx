import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { getSubmitLabel, NewPlaylistForm } from "@/components/app/playlists/new-playlist-form";
import {
  PlaylistDetailWorkspace,
  PlaylistExportConfirmationDialog
} from "@/components/app/playlists/playlist-detail-workspace";
import {
  parsePlaylistsPageFocus,
  PlaylistsPage
} from "@/components/app/playlists/playlists-page";
import type { PlaylistGenerationView } from "@/modules/playlists/generation-store";
import type { PersistentPlaylist } from "@/types/domain";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/playlists",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}));

const playlists: PersistentPlaylist[] = [
  {
    id: "playlist_1",
    userId: "user_1",
    sourceProvider: "apple_music",
    name: "Ukrainian Rap",
    description: "High-energy Ukrainian rap from my saved library.",
    status: "active",
    applePlaylistId: "apple_playlist_1",
    createdFromSortRunId: "sort_1",
    latestLibrarySyncId: "sync_1",
    lastProcessedNewMusicSyncId: null,
    lastGeneratedAt: "2026-06-01T10:00:00.000Z",
    lastExportedAt: "2026-06-02T10:00:00.000Z",
    createdAt: "2026-05-30T10:00:00.000Z",
    updatedAt: "2026-06-02T10:00:00.000Z",
    archivedAt: null
  }
];
const playlistGenerationSummaries = {
  playlist_1: {
    status: "ready_for_review" as const,
    trackCount: 14,
    generatedAt: "2026-06-01T10:00:00.000Z"
  }
};

const playlist = playlists[0];
const recipe = {
  id: "recipe_1",
  userId: "user_1",
  sortRunId: null,
  playlistId: playlist.id,
  position: 0,
  name: "Ukrainian Rap",
  playlistNote: "Keep it hard and energetic.",
  targetTrackMin: null,
  targetTrackMax: 50,
  duplicatePolicy: "avoid_duplicates" as const,
  allowExplicit: true,
  includeLibraryOnly: true,
  tags: [
    {
      id: "tag_genre_rap",
      category: "genre" as const,
      value: "rap"
    }
  ],
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z"
};
const latestGeneration: PlaylistGenerationView = {
  generation: {
    id: "generation_1",
    userId: "user_1",
    playlistId: playlist.id,
    recipeId: recipe.id,
    sortRunId: null,
    librarySyncId: "sync_1",
    status: "ready_for_review",
    recipeSnapshot: {},
    errorSummary: null,
    generatedAt: "2026-06-01T10:00:00.000Z",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z"
  },
  tracks: [
    {
      id: "generation_track_1",
      generationId: "generation_1",
      normalizedTrackId: "track_1",
      position: 0,
      score: 0.9,
      reason: "Genre matches rap",
      decision: "keep",
      createdAt: "2026-06-01T10:00:00.000Z",
      track: {
        id: "track_1",
        appleSongId: "song_1",
        name: "Rap Track",
        artistName: "Rap Artist",
        normalizedName: "rap track",
        normalizedArtist: "rap artist",
        fingerprint: "rap-track::rap-artist",
        genreNames: ["Hip-Hop/Rap"]
      }
    }
  ]
};
const generationHistory = [
  {
    generation: latestGeneration.generation,
    trackCount: latestGeneration.tracks.length
  },
  {
    generation: {
      ...latestGeneration.generation,
      id: "generation_0",
      status: "exported" as const,
      generatedAt: "2026-05-31T10:00:00.000Z",
      createdAt: "2026-05-31T10:00:00.000Z"
    },
    trackCount: 12
  }
];

describe("playlists page", () => {
  it("renders empty saved playlists with safe MVP language", () => {
    const markup = renderToStaticMarkup(<PlaylistsPage playlists={[]} />);

    expect(markup).toContain("Playlists");
    expect(markup).toContain("Your playlist workspace");
    expect(markup).toContain("Create Playlist");
    expect(markup).toContain("No saved playlists yet");
    expect(markup).toContain("review the result before export");
  });

  it("renders saved app-created playlists with review queue status", () => {
    const markup = renderToStaticMarkup(
      <PlaylistsPage
        playlists={playlists}
        generationSummariesByPlaylistId={playlistGenerationSummaries}
      />
    );

    expect(markup).toContain("Ukrainian Rap");
    expect(markup).toContain("High-energy Ukrainian rap from my saved library.");
    expect(markup).toContain("Your playlist workspace");
    expect(markup).toContain("Latest generation");
    expect(markup).toContain("Review needed");
    expect(markup).toContain("Proposed tracks are waiting for review.");
    expect(markup).toContain("14 tracks");
    expect(markup).toContain("/app/playlists/playlist_1");
    expect(markup).not.toContain("No saved playlists yet");
  });

  it("focuses playlist hub on review-needed playlists", () => {
    const exportedPlaylist: PersistentPlaylist = {
      ...playlist,
      id: "playlist_2",
      name: "Already Exported",
      description: "Already reviewed and exported."
    };
    const markup = renderToStaticMarkup(
      <PlaylistsPage
        playlists={[playlist, exportedPlaylist]}
        generationSummariesByPlaylistId={{
          ...playlistGenerationSummaries,
          playlist_2: {
            status: "exported",
            trackCount: 12,
            generatedAt: "2026-06-02T10:00:00.000Z"
          }
        }}
        focus="review"
      />
    );

    expect(markup).toContain("Review queue");
    expect(markup).toContain("Showing saved playlists with proposed tracks waiting for review.");
    expect(markup).toContain("Ukrainian Rap");
    expect(markup).not.toContain("Already Exported");
    expect(markup).toContain("/app/playlists");
  });

  it("parses playlist hub focus search params", () => {
    expect(parsePlaylistsPageFocus("review")).toBe("review");
    expect(parsePlaylistsPageFocus(["review"])).toBe("review");
    expect(parsePlaylistsPageFocus("all")).toBe("all");
    expect(parsePlaylistsPageFocus(undefined)).toBe("all");
  });

  it("renders playlist cards without a generation as recipe work", () => {
    const markup = renderToStaticMarkup(<PlaylistsPage playlists={playlists} />);

    expect(markup).toContain("Recipe needed");
    expect(markup).toContain("Generate this playlist to create a review queue.");
    expect(markup).toContain("No tracks");
  });

  it("renders a form-based playlist creation workflow", () => {
    const markup = renderToStaticMarkup(<NewPlaylistForm />);

    expect(markup).toContain("Create playlist");
    expect(markup).toContain("Playlist name");
    expect(markup).toContain("Matching rules");
    expect(markup).toContain("Add matching rules");
    expect(markup).toContain("You can also finish them inside the playlist workspace.");
    expect(markup).not.toContain("Recipe instructions");
    expect(markup).not.toContain("Genres");
    expect(markup).not.toContain("Allow explicit tracks");
  });

  it("uses recovery-aware submit labels after playlist creation succeeds", () => {
    expect(getSubmitLabel({ isSubmitting: false, hasCreatedPlaylist: false })).toBe("Create Playlist");
    expect(getSubmitLabel({ isSubmitting: true, hasCreatedPlaylist: false })).toBe("Creating...");
    expect(getSubmitLabel({ isSubmitting: false, hasCreatedPlaylist: true })).toBe("Save Recipe");
    expect(getSubmitLabel({ isSubmitting: true, hasCreatedPlaylist: true })).toBe("Saving recipe...");
  });

  it("renders playlist detail with recipe and track review controls", () => {
    const markup = renderToStaticMarkup(
      <PlaylistDetailWorkspace
        playlist={playlist}
        recipe={recipe}
        latestGeneration={latestGeneration}
        generationHistory={generationHistory}
      />
    );

    expect(markup).toContain("Playlist recipe");
    expect(markup).toContain("Recipe name");
    expect(markup).toContain("Keep it hard and energetic.");
    expect(markup).toContain("genre: rap");
    expect(markup).toContain("Save Recipe");
    expect(markup).toContain("Review proposed tracks");
    expect(markup).toContain("Rap Track");
    expect(markup).toContain("Remove");
    expect(markup).toContain("Regenerate Playlist");
    expect(markup).toContain("Mark Review Complete");
    expect(markup).toContain("Create Apple Music playlist");
    expect(markup).toContain("Archive Playlist");
    expect(markup).toContain("Apple Music is not edited, deleted, reordered, or replaced.");
    expect(markup).toContain(
      "Export creates an Apple Music playlist and adds approved tracks."
    );
    expect(markup).toContain(
      "It does not replace, reorder, or remove tracks from existing Apple Music playlists."
    );
    expect(markup).not.toContain("sync exactly");
    expect(markup).not.toContain("replace your Apple Music playlist");
    expect(markup).not.toContain("automatic removal");
    expect(markup).toContain("Generation history");
    expect(markup).toContain("2 runs");
    expect(markup).toContain("12 proposed tracks");
  });

  it("lets users complete review for an empty playlist generation", () => {
    const markup = renderToStaticMarkup(
      <PlaylistDetailWorkspace
        playlist={playlist}
        recipe={recipe}
        latestGeneration={{
          ...latestGeneration,
          tracks: []
        }}
        generationHistory={[
          {
            generation: latestGeneration.generation,
            trackCount: 0
          }
        ]}
      />
    );

    expect(markup).toContain("No tracks matched this recipe.");
    expect(markup).toContain("Complete review to clear this queue");
    expect(markup).toContain("Mark Review Complete");
    expect(markup).toContain("0 approved tracks will be added.");
    expect(markup).toContain("Create Apple Music playlist");
    expect(markup).not.toContain(
      "Generate this playlist to review proposed tracks from your synced Apple Music library."
    );
  });

  it("labels new-music generations as incremental suggestions", () => {
    const newMusicGeneration = {
      ...latestGeneration,
      generation: {
        ...latestGeneration.generation,
        recipeSnapshot: {
          source: "new_music"
        }
      }
    };
    const markup = renderToStaticMarkup(
      <PlaylistDetailWorkspace
        playlist={playlist}
        recipe={recipe}
        latestGeneration={newMusicGeneration}
        generationHistory={[
          {
            generation: newMusicGeneration.generation,
            trackCount: newMusicGeneration.tracks.length
          }
        ]}
      />
    );

    expect(markup).toContain("New music suggestions");
    expect(markup).toContain("Review new music suggestions");
    expect(markup).toContain("These tracks were suggested from your latest library sync.");
    expect(markup).toContain("new music");
  });

  it("renders an explicit playlist export confirmation dialog", () => {
    const markup = renderToStaticMarkup(
      <PlaylistExportConfirmationDialog
        isOpen
        playlistName="Ukrainian Rap"
        approvedTrackCount={18}
        onClose={() => undefined}
        onConfirm={() => undefined}
      />
    );

    expect(markup).toContain("Explicit confirmation required");
    expect(markup).toContain("Create Apple Music playlist?");
    expect(markup).toContain("Export Ukrainian Rap and add 18 approved tracks");
    expect(markup).toContain("Existing Apple Music playlists will not be replaced, reordered, or removed.");
    expect(markup).toContain("add only approved tracks");
    expect(markup).not.toContain("sync exactly");
    expect(markup).not.toContain("replace your Apple Music playlist");
    expect(markup).not.toContain("automatic removal");
    expect(markup).toContain("Cancel");
    expect(markup).toContain("Create Apple Music playlist");
  });
});
