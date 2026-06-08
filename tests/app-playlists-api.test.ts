import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as GET_PLAYLISTS, POST as POST_PLAYLISTS } from "@/app/api/app/playlists/route";
import {
  GET as GET_PLAYLIST,
  PATCH as PATCH_PLAYLIST
} from "@/app/api/app/playlists/[playlistId]/route";
import {
  GET as GET_PLAYLIST_RECIPE,
  PUT as PUT_PLAYLIST_RECIPE
} from "@/app/api/app/playlists/[playlistId]/recipe/route";
import { POST as GENERATE_PLAYLIST } from "@/app/api/app/playlists/[playlistId]/generate/route";
import { POST as EXPORT_GENERATION } from "@/app/api/app/playlists/[playlistId]/generations/[generationId]/export/route";
import { PATCH as PATCH_GENERATION_TRACKS } from "@/app/api/app/playlists/[playlistId]/generations/[generationId]/tracks/route";
import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { withPgBoss } from "@/lib/pg-boss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabasePlaylistRecipeStore,
  type PlaylistRecipeStore
} from "@/modules/playlist-recipes/store";
import {
  createSupabasePlaylistGenerationStore,
  PlaylistGenerationTrackNotFoundError,
  type PlaylistGenerationStore
} from "@/modules/playlists/generation-store";
import {
  createSupabasePlaylistGenerationExportStore,
  queuePlaylistGenerationExport
} from "@/modules/playlists/generation-export";
import { createSupabasePlaylistStore, type PlaylistStore } from "@/modules/playlists/store";
import type { PersistentPlaylist } from "@/types/domain";

vi.mock("@/lib/auth/profile", () => ({
  ensureProfileForUser: vi.fn()
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedSession: vi.fn()
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseServiceRoleClient: vi.fn()
}));

vi.mock("@/lib/pg-boss", () => ({
  withPgBoss: vi.fn()
}));

vi.mock("@/modules/playlists/store", () => ({
  createSupabasePlaylistStore: vi.fn()
}));

vi.mock("@/modules/playlist-recipes/store", () => ({
  createSupabasePlaylistRecipeStore: vi.fn()
}));

vi.mock("@/modules/playlists/generation-store", () => ({
  createSupabasePlaylistGenerationStore: vi.fn(),
  PlaylistGenerationTrackNotFoundError: class PlaylistGenerationTrackNotFoundError extends Error {
    constructor() {
      super("Playlist generation track not found.");
      this.name = "PlaylistGenerationTrackNotFoundError";
    }
  }
}));

vi.mock("@/modules/playlists/generation-export", () => ({
  createSupabasePlaylistGenerationExportStore: vi.fn(),
  queuePlaylistGenerationExport: vi.fn()
}));

const authMock = vi.mocked(getAuthenticatedSession);
const ensureProfileMock = vi.mocked(ensureProfileForUser);
const serviceRoleMock = vi.mocked(createSupabaseServiceRoleClient);
const withPgBossMock = vi.mocked(withPgBoss);
const playlistStoreFactoryMock = vi.mocked(createSupabasePlaylistStore);
const recipeStoreFactoryMock = vi.mocked(createSupabasePlaylistRecipeStore);
const generationStoreFactoryMock = vi.mocked(createSupabasePlaylistGenerationStore);
const generationExportStoreFactoryMock = vi.mocked(createSupabasePlaylistGenerationExportStore);
const queuePlaylistGenerationExportMock = vi.mocked(queuePlaylistGenerationExport);

const playlist: PersistentPlaylist = {
  id: "22222222-2222-4222-8222-222222222222",
  userId: "user_1",
  sourceProvider: "apple_music" as const,
  name: "Ukrainian Rap",
  description: "High-energy Ukrainian rap.",
  status: "draft" as const,
  applePlaylistId: null,
  createdFromSortRunId: null,
  latestLibrarySyncId: null,
  lastProcessedNewMusicSyncId: null,
  lastGeneratedAt: null,
  lastExportedAt: null,
  createdAt: "2026-06-08T10:00:00.000Z",
  updatedAt: "2026-06-08T10:00:00.000Z",
  archivedAt: null
};

const recipe = {
  id: "33333333-3333-4333-8333-333333333333",
  userId: "user_1",
  sortRunId: null,
  playlistId: playlist.id,
  position: 0,
  name: "Ukrainian Rap",
  playlistNote: "Keep it hard and energetic.",
  targetTrackMin: 30,
  targetTrackMax: 80,
  duplicatePolicy: "avoid_duplicates" as const,
  allowExplicit: true,
  includeLibraryOnly: true,
  tags: [{ id: "tag_language_ukrainian", category: "language" as const, value: "Ukrainian" }],
  createdAt: "2026-06-08T10:00:00.000Z",
  updatedAt: "2026-06-08T10:00:00.000Z"
};

const generation = {
  generation: {
    id: "44444444-4444-4444-8444-444444444444",
    userId: "user_1",
    playlistId: playlist.id,
    recipeId: recipe.id,
    sortRunId: null,
    librarySyncId: "55555555-5555-4555-8555-555555555555",
    status: "ready_for_review" as const,
    recipeSnapshot: {},
    errorSummary: null,
    generatedAt: "2026-06-08T11:00:00.000Z",
    createdAt: "2026-06-08T11:00:00.000Z",
    updatedAt: "2026-06-08T11:00:00.000Z"
  },
  tracks: [
    {
      id: "66666666-6666-4666-8666-666666666666",
      generationId: "44444444-4444-4444-8444-444444444444",
      normalizedTrackId: "77777777-7777-4777-8777-777777777777",
      position: 0,
      score: 0.91,
      reason: "Genre matches rap",
      decision: "keep" as const,
      createdAt: "2026-06-08T11:00:00.000Z",
      track: {
        id: "77777777-7777-4777-8777-777777777777",
        appleSongId: "song_1",
        name: "Track One",
        artistName: "Artist One",
        normalizedName: "track one",
        normalizedArtist: "artist one",
        fingerprint: "track-one::artist-one",
        genreNames: ["Hip-Hop/Rap"]
      }
    }
  ]
};

const playlistStore: PlaylistStore = {
  async listPlaylists() {
    return [playlist];
  },
  getPlaylist: vi.fn<PlaylistStore["getPlaylist"]>(async () => playlist),
  createPlaylist: vi.fn<PlaylistStore["createPlaylist"]>(async () => playlist),
  updatePlaylist: vi.fn<PlaylistStore["updatePlaylist"]>(async () => ({
    ...playlist,
    status: "active"
  })),
  archivePlaylist: vi.fn()
};

const recipeStore: PlaylistRecipeStore = {
  listRecipesForSort: vi.fn(),
  listRecipesForPlaylist: vi.fn(async () => []),
  createRecipe: vi.fn(async () => recipe),
  updateRecipe: vi.fn(async () => recipe),
  deleteRecipe: vi.fn(),
  reorderRecipes: vi.fn(),
  reorderRecipesForPlaylist: vi.fn()
};

const generationStore: PlaylistGenerationStore = {
  getLatestGeneration: vi.fn<PlaylistGenerationStore["getLatestGeneration"]>(
    async () => generation
  ),
  listGenerationHistory: vi.fn<PlaylistGenerationStore["listGenerationHistory"]>(async () => [
    {
      generation: generation.generation,
      trackCount: generation.tracks.length
    }
  ]),
  generatePlaylist: vi.fn<PlaylistGenerationStore["generatePlaylist"]>(async () => ({
    status: "generated" as const,
    recipe,
    generation
  })),
  updateTrackDecisions: vi.fn<PlaylistGenerationStore["updateTrackDecisions"]>(async () => ({
    ...generation,
    tracks: generation.tracks.map((track) => ({ ...track, decision: "remove" as const }))
  }))
};
const generationExportStore = {};

describe("platform playlist API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      status: "authenticated",
      user: { id: "user_1", email: "user@example.com" },
      supabase: null
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);
    ensureProfileMock.mockResolvedValue({
      status: "ready",
      profile: {
        id: "user_1",
        email: "user@example.com",
        isAdmin: false
      }
    });
    serviceRoleMock.mockReturnValue({} as ReturnType<typeof createSupabaseServiceRoleClient>);
    withPgBossMock.mockImplementation(async (callback) => callback({} as Parameters<typeof callback>[0]));
    playlistStoreFactoryMock.mockReturnValue(playlistStore);
    recipeStoreFactoryMock.mockReturnValue(recipeStore);
    generationStoreFactoryMock.mockReturnValue(generationStore);
    generationExportStoreFactoryMock.mockReturnValue(
      generationExportStore as ReturnType<typeof createSupabasePlaylistGenerationExportStore>
    );
    queuePlaylistGenerationExportMock.mockResolvedValue({
      status: "queued",
      playlistId: playlist.id,
      generationId: generation.generation.id,
      exportId: "88888888-8888-4888-8888-888888888888",
      selectedTrackCount: 1,
      jobId: "job_1"
    });
  });

  it("requires authentication before listing playlists", async () => {
    authMock.mockResolvedValueOnce({
      status: "signed_out",
      user: null,
      supabase: null
    });

    const response = await GET_PLAYLISTS();

    await expect(response.json()).resolves.toEqual({ error: "Sign in required." });
    expect(response.status).toBe(401);
  });

  it("creates persistent playlists without Apple Music writes", async () => {
    const response = await POST_PLAYLISTS(
      new Request("http://test.local/api/app/playlists", {
        method: "POST",
        body: JSON.stringify({
          name: "Ukrainian Rap",
          description: "High-energy Ukrainian rap."
        })
      })
    );

    await expect(response.json()).resolves.toEqual({ playlist });
    expect(response.status).toBe(201);
    expect(ensureProfileMock).toHaveBeenCalled();
    expect(playlistStore.createPlaylist).toHaveBeenCalledWith({
      userId: "user_1",
      playlist: {
        name: "Ukrainian Rap",
        description: "High-energy Ukrainian rap."
      }
    });
  });

  it("updates a user-owned persistent playlist", async () => {
    const response = await PATCH_PLAYLIST(
      new Request("http://test.local/api/app/playlists/22222222-2222-4222-8222-222222222222", {
        method: "PATCH",
        body: JSON.stringify({
          status: "active"
        })
      }),
      { params: Promise.resolve({ playlistId: playlist.id }) }
    );

    await expect(response.json()).resolves.toMatchObject({
      playlist: {
        id: playlist.id,
        status: "active"
      }
    });
    expect(response.status).toBe(200);
    expect(playlistStore.updatePlaylist).toHaveBeenCalledWith({
      userId: "user_1",
      playlistId: playlist.id,
      values: { status: "active" }
    });
  });

  it.each([
    ["applePlaylistId", "p.existing-user-playlist"],
    ["latestLibrarySyncId", "33333333-3333-4333-8333-333333333333"],
    ["lastProcessedNewMusicSyncId", "33333333-3333-4333-8333-333333333333"],
    ["lastGeneratedAt", "2026-06-08T12:00:00.000Z"],
    ["lastExportedAt", "2026-06-08T12:00:00.000Z"]
  ])("rejects client attempts to set server-managed playlist field %s", async (field, value) => {
    const response = await PATCH_PLAYLIST(
      new Request("http://test.local/api/app/playlists/22222222-2222-4222-8222-222222222222", {
        method: "PATCH",
        body: JSON.stringify({
          [field]: value
        })
      }),
      { params: Promise.resolve({ playlistId: playlist.id }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Apple Music export fields are managed by the server."
    });
    expect(response.status).toBe(400);
    expect(playlistStore.updatePlaylist).not.toHaveBeenCalled();
  });

  it("archives a user-owned persistent playlist without Apple Music writes", async () => {
    vi.mocked(playlistStore.updatePlaylist).mockResolvedValueOnce({
      ...playlist,
      status: "archived",
      archivedAt: "2026-06-08T12:00:00.000Z"
    });

    const response = await PATCH_PLAYLIST(
      new Request("http://test.local/api/app/playlists/22222222-2222-4222-8222-222222222222", {
        method: "PATCH",
        body: JSON.stringify({
          status: "archived"
        })
      }),
      { params: Promise.resolve({ playlistId: playlist.id }) }
    );

    await expect(response.json()).resolves.toMatchObject({
      playlist: {
        id: playlist.id,
        status: "archived"
      }
    });
    expect(response.status).toBe(200);
    expect(playlistStore.updatePlaylist).toHaveBeenCalledWith({
      userId: "user_1",
      playlistId: playlist.id,
      values: { status: "archived" }
    });
    expect(queuePlaylistGenerationExportMock).not.toHaveBeenCalled();
  });

  it("returns playlist detail with recipe and generation state", async () => {
    vi.mocked(recipeStore.listRecipesForPlaylist).mockResolvedValueOnce([recipe]);

    const response = await GET_PLAYLIST(new Request("http://test.local"), {
      params: Promise.resolve({ playlistId: playlist.id })
    });

    await expect(response.json()).resolves.toEqual({
      playlist,
      recipe,
      latestGeneration: generation,
      generationHistory: [
        {
          generation: generation.generation,
          trackCount: generation.tracks.length
        }
      ]
    });
    expect(generationStore.getLatestGeneration).toHaveBeenCalledWith({
      userId: "user_1",
      playlistId: playlist.id
    });
    expect(generationStore.listGenerationHistory).toHaveBeenCalledWith({
      userId: "user_1",
      playlistId: playlist.id
    });
  });

  it("does not return archived playlists from the active detail API", async () => {
    vi.mocked(playlistStore.getPlaylist).mockResolvedValueOnce({
      ...playlist,
      status: "archived",
      archivedAt: "2026-06-08T12:00:00.000Z"
    });

    const response = await GET_PLAYLIST(new Request("http://test.local"), {
      params: Promise.resolve({ playlistId: playlist.id })
    });

    await expect(response.json()).resolves.toEqual({ error: "Playlist not found." });
    expect(response.status).toBe(404);
    expect(recipeStore.listRecipesForPlaylist).not.toHaveBeenCalled();
    expect(generationStore.getLatestGeneration).not.toHaveBeenCalled();
  });

  it("does not mutate archived playlists through the playlist API", async () => {
    vi.mocked(playlistStore.getPlaylist).mockResolvedValueOnce({
      ...playlist,
      status: "archived",
      archivedAt: "2026-06-08T12:00:00.000Z"
    });

    const response = await PATCH_PLAYLIST(
      new Request("http://test.local/api/app/playlists/22222222-2222-4222-8222-222222222222", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Reopened playlist"
        })
      }),
      { params: Promise.resolve({ playlistId: playlist.id }) }
    );

    await expect(response.json()).resolves.toEqual({ error: "Playlist not found." });
    expect(response.status).toBe(404);
    expect(playlistStore.updatePlaylist).not.toHaveBeenCalled();
  });

  it("creates a playlist-owned recipe when none exists", async () => {
    const response = await PUT_PLAYLIST_RECIPE(
      new Request("http://test.local", {
        method: "PUT",
        body: JSON.stringify({
          name: "Ukrainian Rap",
          playlistNote: "Keep it hard and energetic.",
          tags: [{ id: "tag_language_ukrainian", category: "language", value: "Ukrainian" }]
        })
      }),
      { params: Promise.resolve({ playlistId: playlist.id }) }
    );

    await expect(response.json()).resolves.toEqual({ recipe });
    expect(response.status).toBe(201);
    expect(recipeStore.createRecipe).toHaveBeenCalledWith({
      userId: "user_1",
      recipe: expect.objectContaining({
        playlistId: playlist.id,
        sortRunId: null,
        position: 0,
        name: "Ukrainian Rap"
      })
    });
  });

  it("updates the existing playlist-owned recipe", async () => {
    vi.mocked(recipeStore.listRecipesForPlaylist).mockResolvedValueOnce([recipe]);

    const response = await PUT_PLAYLIST_RECIPE(
      new Request("http://test.local", {
        method: "PUT",
        body: JSON.stringify({
          playlistNote: "More aggressive tracks."
        })
      }),
      { params: Promise.resolve({ playlistId: playlist.id }) }
    );

    await expect(response.json()).resolves.toEqual({ recipe });
    expect(response.status).toBe(200);
    expect(recipeStore.updateRecipe).toHaveBeenCalledWith({
      userId: "user_1",
      recipeId: recipe.id,
      values: { playlistNote: "More aggressive tracks." }
    });
  });

  it("does not edit recipes for archived playlists", async () => {
    vi.mocked(playlistStore.getPlaylist).mockResolvedValueOnce({
      ...playlist,
      status: "archived",
      archivedAt: "2026-06-08T12:00:00.000Z"
    });

    const response = await PUT_PLAYLIST_RECIPE(
      new Request("http://test.local", {
        method: "PUT",
        body: JSON.stringify({
          playlistNote: "More aggressive tracks."
        })
      }),
      { params: Promise.resolve({ playlistId: playlist.id }) }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Archived playlists cannot be edited."
    });
    expect(response.status).toBe(409);
    expect(recipeStore.updateRecipe).not.toHaveBeenCalled();
    expect(recipeStore.createRecipe).not.toHaveBeenCalled();
  });

  it("can read the playlist recipe directly", async () => {
    vi.mocked(recipeStore.listRecipesForPlaylist).mockResolvedValueOnce([recipe]);

    const response = await GET_PLAYLIST_RECIPE(new Request("http://test.local"), {
      params: Promise.resolve({ playlistId: playlist.id })
    });

    await expect(response.json()).resolves.toEqual({ recipe });
  });

  it("does not return recipes for archived playlists", async () => {
    vi.mocked(playlistStore.getPlaylist).mockResolvedValueOnce({
      ...playlist,
      status: "archived",
      archivedAt: "2026-06-08T12:00:00.000Z"
    });

    const response = await GET_PLAYLIST_RECIPE(new Request("http://test.local"), {
      params: Promise.resolve({ playlistId: playlist.id })
    });

    await expect(response.json()).resolves.toEqual({ error: "Playlist not found." });
    expect(response.status).toBe(404);
    expect(recipeStore.listRecipesForPlaylist).not.toHaveBeenCalled();
  });

  it("generates one playlist from its saved recipe without creating a Sort", async () => {
    const response = await GENERATE_PLAYLIST(new Request("http://test.local", { method: "POST" }), {
      params: Promise.resolve({ playlistId: playlist.id })
    });

    await expect(response.json()).resolves.toEqual({
      recipe,
      generation
    });
    expect(response.status).toBe(201);
    expect(generationStore.generatePlaylist).toHaveBeenCalledWith({
      userId: "user_1",
      playlistId: playlist.id
    });
  });

  it("does not generate archived playlists", async () => {
    vi.mocked(generationStore.generatePlaylist).mockResolvedValueOnce({
      status: "playlist_archived",
      message: "Archived playlists cannot be generated."
    });

    const response = await GENERATE_PLAYLIST(new Request("http://test.local", { method: "POST" }), {
      params: Promise.resolve({ playlistId: playlist.id })
    });

    await expect(response.json()).resolves.toEqual({
      error: "Archived playlists cannot be generated."
    });
    expect(response.status).toBe(409);
  });

  it("persists review decisions for generated playlist tracks", async () => {
    const response = await PATCH_GENERATION_TRACKS(
      new Request("http://test.local", {
        method: "PATCH",
        body: JSON.stringify({
          decisions: [
            {
              trackId: generation.tracks[0].id,
              decision: "remove"
            }
          ]
        })
      }),
      {
        params: Promise.resolve({
          playlistId: playlist.id,
          generationId: generation.generation.id
        })
      }
    );

    await expect(response.json()).resolves.toMatchObject({
      generation: {
        generation: {
          id: generation.generation.id
        },
        tracks: [
          {
            decision: "remove"
          }
        ]
      }
    });
    expect(response.status).toBe(200);
    expect(generationStore.updateTrackDecisions).toHaveBeenCalledWith({
      userId: "user_1",
      playlistId: playlist.id,
      generationId: generation.generation.id,
      markReviewed: false,
      decisions: [
        {
          trackId: generation.tracks[0].id,
          decision: "remove"
        }
      ]
    });
  });

  it("does not save track reviews for archived playlists", async () => {
    vi.mocked(playlistStore.getPlaylist).mockResolvedValueOnce({
      ...playlist,
      status: "archived",
      archivedAt: "2026-06-08T12:00:00.000Z"
    });

    const response = await PATCH_GENERATION_TRACKS(
      new Request("http://test.local", {
        method: "PATCH",
        body: JSON.stringify({
          decisions: [
            {
              trackId: generation.tracks[0].id,
              decision: "remove"
            }
          ]
        })
      }),
      {
        params: Promise.resolve({
          playlistId: playlist.id,
          generationId: generation.generation.id
        })
      }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Archived playlists cannot be reviewed."
    });
    expect(response.status).toBe(409);
    expect(generationStore.updateTrackDecisions).not.toHaveBeenCalled();
  });

  it("returns not found when a reviewed track does not belong to the generation", async () => {
    vi.mocked(generationStore.updateTrackDecisions).mockRejectedValueOnce(
      new PlaylistGenerationTrackNotFoundError()
    );

    const response = await PATCH_GENERATION_TRACKS(
      new Request("http://test.local", {
        method: "PATCH",
        body: JSON.stringify({
          decisions: [
            {
              trackId: "99999999-9999-4999-8999-999999999999",
              decision: "remove"
            }
          ]
        })
      }),
      {
        params: Promise.resolve({
          playlistId: playlist.id,
          generationId: generation.generation.id
        })
      }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Playlist generation track not found."
    });
    expect(response.status).toBe(404);
  });

  it("marks a generated playlist reviewed only when review completion is explicit", async () => {
    const response = await PATCH_GENERATION_TRACKS(
      new Request("http://test.local", {
        method: "PATCH",
        body: JSON.stringify({
          markReviewed: true,
          decisions: [
            {
              trackId: generation.tracks[0].id,
              decision: "keep"
            }
          ]
        })
      }),
      {
        params: Promise.resolve({
          playlistId: playlist.id,
          generationId: generation.generation.id
        })
      }
    );

    await expect(response.json()).resolves.toMatchObject({
      generation: {
        generation: {
          id: generation.generation.id
        }
      }
    });
    expect(response.status).toBe(200);
    expect(generationStore.updateTrackDecisions).toHaveBeenCalledWith({
      userId: "user_1",
      playlistId: playlist.id,
      generationId: generation.generation.id,
      markReviewed: true,
      decisions: [
        {
          trackId: generation.tracks[0].id,
          decision: "keep"
        }
      ]
    });
  });

  it("queues one reviewed playlist generation for Apple Music export", async () => {
    const response = await EXPORT_GENERATION(
      new Request("http://test.local", { method: "POST" }),
      {
        params: Promise.resolve({
          playlistId: playlist.id,
          generationId: generation.generation.id
        })
      }
    );

    await expect(response.json()).resolves.toEqual({
      export: {
        status: "queued",
        playlistId: playlist.id,
        generationId: generation.generation.id,
        selectedTrackCount: 1,
        exportId: "88888888-8888-4888-8888-888888888888",
        jobId: "job_1"
      }
    });
    expect(response.status).toBe(202);
    expect(queuePlaylistGenerationExportMock).toHaveBeenCalledWith({
      store: generationExportStore,
      queue: {},
      userId: "user_1",
      playlistId: playlist.id,
      generationId: generation.generation.id
    });
  });

  it("returns conflict when a playlist generation has not reached reviewable export state", async () => {
    queuePlaylistGenerationExportMock.mockResolvedValueOnce({
      status: "invalid_state",
      message: "Review the generated playlist before export."
    });

    const response = await EXPORT_GENERATION(
      new Request("http://test.local", { method: "POST" }),
      {
        params: Promise.resolve({
          playlistId: playlist.id,
          generationId: generation.generation.id
        })
      }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Review the generated playlist before export."
    });
    expect(response.status).toBe(409);
  });
});
