import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { NewPlaylistForm } from "@/components/app/playlists/new-playlist-form";
import { PlaylistDetailWorkspace } from "@/components/app/playlists/playlist-detail-workspace";
import { PlaylistsPage } from "@/components/app/playlists/playlists-page";
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
    lastGeneratedAt: "2026-06-01T10:00:00.000Z",
    lastExportedAt: "2026-06-02T10:00:00.000Z",
    createdAt: "2026-05-30T10:00:00.000Z",
    updatedAt: "2026-06-02T10:00:00.000Z",
    archivedAt: null
  }
];

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
    expect(markup).toContain("Saved playlist system");
    expect(markup).toContain("Create Playlist");
    expect(markup).toContain("App-created playlists only");
    expect(markup).toContain("No saved playlists yet");
    expect(markup).toContain("review the result before export");
    expect(markup).toContain("Organize My Library");
  });

  it("renders saved app-created playlists and export status", () => {
    const markup = renderToStaticMarkup(<PlaylistsPage playlists={playlists} />);

    expect(markup).toContain("Ukrainian Rap");
    expect(markup).toContain("High-energy Ukrainian rap from my saved library.");
    expect(markup).toContain("Saved playlists");
    expect(markup).toContain("Apple Music exports");
    expect(markup).toContain("Exported");
    expect(markup).toContain("/app/playlists/playlist_1");
    expect(markup).not.toContain("No saved playlists yet");
  });

  it("renders a form-based playlist creation workflow", () => {
    const markup = renderToStaticMarkup(<NewPlaylistForm />);

    expect(markup).toContain("Create playlist");
    expect(markup).toContain("Playlist name");
    expect(markup).toContain("Recipe instructions");
    expect(markup).toContain("Matching rules");
    expect(markup).toContain("Genres");
    expect(markup).toContain("Moods");
    expect(markup).toContain("Allow explicit tracks");
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
    expect(markup).toContain("Keep it hard and energetic.");
    expect(markup).toContain("Review proposed tracks");
    expect(markup).toContain("Rap Track");
    expect(markup).toContain("Remove");
    expect(markup).toContain("Create Apple Music playlist");
    expect(markup).toContain("Generation history");
    expect(markup).toContain("2 runs");
    expect(markup).toContain("12 proposed tracks");
  });
});
