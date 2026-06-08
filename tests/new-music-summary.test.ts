import { describe, expect, it, vi } from "vitest";

import {
  createNewMusicRecommendations,
  createSupabaseNewMusicStore,
  getNewMusicSummary,
  processNewMusic,
  type NewMusicStore
} from "@/modules/library-syncs/new-music";
import type { NormalizedTrack, PersistentPlaylist, PlaylistRecipe } from "@/types/domain";

function createStore(overrides: Partial<NewMusicStore> = {}): NewMusicStore {
  return {
    listRecentCompletedSyncs: vi.fn().mockResolvedValue([
      { id: "sync_latest", createdAt: "2026-06-02T10:00:00.000Z" },
      { id: "sync_previous", createdAt: "2026-06-01T10:00:00.000Z" }
    ]),
    listOwnedTrackIdsForSync: vi.fn().mockImplementation(({ syncId }: { syncId: string }) =>
      Promise.resolve(syncId === "sync_latest" ? ["track_1", "track_2"] : ["track_1"])
    ),
    ...overrides
  };
}

describe("new music summary", () => {
  it("waits for the first completed library sync", async () => {
    const store = createStore({
      listRecentCompletedSyncs: vi.fn().mockResolvedValue([])
    });

    await expect(getNewMusicSummary({ store, userId: "user_1" })).resolves.toEqual({
      latestSyncId: null,
      previousSyncId: null,
      newTrackCount: 0,
      canProcess: false,
      message: "Complete a library sync before processing new music."
    });
  });

  it("waits for a second completed sync before comparing new songs", async () => {
    const store = createStore({
      listRecentCompletedSyncs: vi.fn().mockResolvedValue([
        { id: "sync_latest", createdAt: "2026-06-02T10:00:00.000Z" }
      ])
    });

    await expect(getNewMusicSummary({ store, userId: "user_1" })).resolves.toEqual({
      latestSyncId: "sync_latest",
      previousSyncId: null,
      newTrackCount: 0,
      canProcess: false,
      message: "Run another sync later to detect new songs since the first sync."
    });
  });

  it("detects tracks present in the latest sync but not the previous sync", async () => {
    const store = createStore();

    await expect(getNewMusicSummary({ store, userId: "user_1" })).resolves.toEqual({
      latestSyncId: "sync_latest",
      previousSyncId: "sync_previous",
      newTrackCount: 1,
      canProcess: true,
      message: "1 new song detected since the previous sync."
    });
  });

  it("keeps processing disabled when no new tracks are detected", async () => {
    const store = createStore({
      listOwnedTrackIdsForSync: vi.fn().mockResolvedValue(["track_1"])
    });

    await expect(getNewMusicSummary({ store, userId: "user_1" })).resolves.toMatchObject({
      newTrackCount: 0,
      canProcess: false,
      message: "No new songs detected since the previous sync."
    });
  });

  it("keeps processing disabled when saved playlists already processed the latest sync", async () => {
    const store = createStore({
      listPlaylistRecipesForNewMusic: vi.fn().mockResolvedValue([
        {
          playlist: {
            ...playlist,
            lastProcessedNewMusicSyncId: "sync_latest"
          },
          recipe
        }
      ])
    });

    await expect(getNewMusicSummary({ store, userId: "user_1" })).resolves.toMatchObject({
      latestSyncId: "sync_latest",
      previousSyncId: "sync_previous",
      newTrackCount: 1,
      canProcess: false,
      message: "New songs from the latest sync have already been processed for your saved playlists."
    });
  });

  it("processes new tracks into review-only playlist recommendations", async () => {
    const markNewMusicProcessed = vi.fn().mockResolvedValue(undefined);
    const storeNewMusicGenerations = vi.fn().mockResolvedValue(undefined);
    const store = createStore({
      listPlaylistRecipesForNewMusic: vi.fn().mockResolvedValue([
        {
          playlist,
          recipe
        }
      ]),
      markNewMusicProcessed,
      storeNewMusicGenerations,
      listTracksByIds: vi.fn().mockResolvedValue([track]),
      listClassificationsByTrackIds: vi.fn().mockResolvedValue([
        {
          normalizedTrackId: track.id,
          fingerprint: track.fingerprint,
          language: "ukrainian",
          genre: "Hip-Hop/Rap",
          subgenres: ["rap"],
          moods: ["Hype"],
          energy: 0.88,
          confidence: 0.9,
          source: "heuristic",
          version: 1,
          metadataHash: "hash_1"
        }
      ])
    });

    await expect(processNewMusic({ store, userId: "user_1" })).resolves.toMatchObject({
      status: "processed",
      recommendations: [
        {
          playlistId: playlist.id,
          playlistName: "Ukrainian Rap",
          trackCount: 1,
          tracks: [
            {
              normalizedTrackId: track.id,
              name: "Kyiv Night",
              artistName: "Artist"
            }
          ]
        }
      ]
    });

    expect(markNewMusicProcessed).toHaveBeenCalledWith({
      userId: "user_1",
      playlistIds: [playlist.id],
      syncId: "sync_latest"
    });
    expect(storeNewMusicGenerations).toHaveBeenCalledWith({
      userId: "user_1",
      syncId: "sync_latest",
      playlistRecipes: [
        {
          playlist,
          recipe
        }
      ],
      recommendations: [
        expect.objectContaining({
          playlistId: playlist.id,
          recipeId: recipe.id,
          trackCount: 1,
          tracks: [
            expect.objectContaining({
              normalizedTrackId: track.id
            })
          ]
        })
      ]
    });
  });

  it("returns no playlist matches when saved recipes reject the new tracks", () => {
    expect(
      createNewMusicRecommendations({
        playlistRecipes: [
          {
            playlist,
            recipe: {
              ...recipe,
              tags: [
                {
                  id: "tag_jazz",
                  category: "genre",
                  value: "Jazz"
                }
              ]
            }
          }
        ],
        tracks: [track],
        classifications: [
          {
            normalizedTrackId: track.id,
            fingerprint: track.fingerprint,
            language: "ukrainian",
            genre: "Hip-Hop/Rap",
            subgenres: ["rap"],
            moods: ["Hype"],
            energy: 0.88,
            confidence: 0.9,
            source: "heuristic",
            version: 1,
            metadataHash: "hash_1"
          }
        ]
      })
    ).toEqual([]);
  });

  it("does not duplicate an already persisted new-music generation for the same playlist and sync", async () => {
    const { supabase, calls } = createExistingGenerationSupabase();
    const store = createSupabaseNewMusicStore(supabase);

    await store.storeNewMusicGenerations?.({
      userId: "user_1",
      syncId: "sync_latest",
      playlistRecipes: [{ playlist, recipe }],
      recommendations: [
        {
          playlistId: playlist.id,
          playlistName: playlist.name,
          recipeId: recipe.id,
          recipeName: recipe.name,
          trackCount: 1,
          tracks: [
            {
              normalizedTrackId: track.id,
              appleSongId: track.appleSongId ?? null,
              name: track.name,
              artistName: track.artistName,
              albumName: track.albumName ?? null,
              score: 0.9,
              reason: "Matched genre."
            }
          ]
        }
      ]
    });

    expect(calls).toContain("playlist_generations.select:id");
    expect(calls).toContain("playlist_generations.contains:recipe_snapshot");
    expect(calls).toContain("playlists.update");
    expect(calls).not.toContain("playlist_generations.insert");
    expect(calls).not.toContain("playlist_generation_tracks.insert");
  });
});

const playlist: PersistentPlaylist = {
  id: "playlist_1",
  userId: "user_1",
  sourceProvider: "apple_music",
  name: "Ukrainian Rap",
  description: "High energy.",
  status: "active",
  applePlaylistId: null,
  createdFromSortRunId: null,
  latestLibrarySyncId: null,
  lastProcessedNewMusicSyncId: null,
  lastGeneratedAt: null,
  lastExportedAt: null,
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z",
  archivedAt: null
};

const recipe: PlaylistRecipe = {
  id: "recipe_1",
  userId: "user_1",
  playlistId: playlist.id,
  sortRunId: null,
  position: 0,
  name: "Ukrainian Rap",
  playlistNote: "Ukrainian rap with hype energy.",
  targetTrackMin: 1,
  targetTrackMax: 10,
  duplicatePolicy: "avoid_duplicates",
  allowExplicit: true,
  includeLibraryOnly: true,
  tags: [
    {
      id: "tag_ukrainian",
      category: "language",
      value: "ukrainian"
    },
    {
      id: "tag_rap",
      category: "genre",
      value: "Hip-Hop/Rap"
    }
  ],
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-01T10:00:00.000Z"
};

const track: NormalizedTrack = {
  id: "track_2",
  appleSongId: "song_2",
  name: "Kyiv Night",
  artistName: "Artist",
  albumName: "Album",
  normalizedName: "kyiv night",
  normalizedArtist: "artist",
  normalizedAlbum: "album",
  fingerprint: "fingerprint_2",
  durationInMillis: 180000,
  genreNames: ["Hip-Hop/Rap"],
  contentRating: "clean",
  isrc: "US1234567890"
};

function createExistingGenerationSupabase() {
  const calls: string[] = [];
  const supabase = {
    from(table: string) {
      return new FakeSupabaseQuery(table, calls);
    }
  };

  return {
    calls,
    supabase: supabase as unknown as Parameters<typeof createSupabaseNewMusicStore>[0]
  };
}

class FakeSupabaseQuery {
  constructor(
    private readonly table: string,
    private readonly calls: string[]
  ) {}

  select(columns: string) {
    this.calls.push(`${this.table}.select:${columns}`);
    return this;
  }

  insert() {
    this.calls.push(`${this.table}.insert`);
    return this;
  }

  update() {
    this.calls.push(`${this.table}.update`);
    return this;
  }

  eq() {
    return this;
  }

  neq() {
    return this;
  }

  contains(column: string) {
    this.calls.push(`${this.table}.contains:${column}`);
    return this;
  }

  limit() {
    return this;
  }

  async maybeSingle() {
    return {
      data: this.table === "playlist_generations" ? { id: "generation_existing" } : null,
      error: null
    };
  }

  async single() {
    return {
      data: { id: "generation_new" },
      error: null
    };
  }

  then(resolve: (value: { data: null; error: null }) => void) {
    resolve({ data: null, error: null });
  }
}
