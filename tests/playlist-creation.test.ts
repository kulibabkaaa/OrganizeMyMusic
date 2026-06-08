import { describe, expect, it, vi } from "vitest";

import {
  handlePlaylistCreationJob,
  type PlaylistCreationStore
} from "@/modules/apple-music/playlist-creation";

function createStore(overrides: Partial<PlaylistCreationStore> = {}) {
  const store: PlaylistCreationStore = {
    async getConfirmedSortRun() {
      return {
        id: "sort_1",
        userId: "user_1",
        state: "creating_playlists"
      };
    },
    async getConnectedAppleMusicConnection() {
      return {
        id: "connection_1",
        status: "connected",
        storefront: "us",
        encryptedUserToken: "encrypted-token"
      };
    },
    async listSelectedPlaylists() {
      return [
        {
          id: "sort_playlist_1",
          title: "Ukrainian Rap",
          description: "Ukrainian rap tracks.",
          applePlaylistId: null,
          tracks: [
            {
              normalizedTrackId: "track_1",
              appleSongId: "apple_1",
              position: 1
            },
            {
              normalizedTrackId: "track_2",
              appleSongId: "apple_2",
              position: 2
            },
            {
              normalizedTrackId: "track_3",
              appleSongId: "apple_3",
              position: 3
            }
          ]
        },
        {
          id: "sort_playlist_2",
          title: "Gym Rap",
          description: "Workout rap tracks.",
          applePlaylistId: "p.existing",
          tracks: [
            {
              normalizedTrackId: "track_4",
              appleSongId: "apple_4",
              position: 1
            }
          ]
        }
      ];
    },
    setApplePlaylistId: vi.fn(async () => undefined),
    markPlaylistTracksExported: vi.fn(async () => undefined),
    createJobEvent: vi.fn(async () => undefined),
    markSortRunFailed: vi.fn(async () => undefined),
    markSortRunCompleted: vi.fn(async () => undefined)
  };

  return Object.assign(store, overrides);
}

describe("handlePlaylistCreationJob", () => {
  it("creates missing selected Apple Music playlists and stores returned IDs", async () => {
    const store = createStore();
    const createDeveloperToken = vi.fn(async () => ({
      developerToken: "developer-token",
      expiresAt: "2026-05-22T20:30:00.000Z"
    }));
    const decryptUserToken = vi.fn(() => "music-user-token");
    const createLibraryPlaylist = vi.fn(async () => ({ id: "p.created" }));
    const addTracksToPlaylist = vi.fn(async () => undefined);

    await expect(
      handlePlaylistCreationJob({
        store,
        data: {
          sortRunId: "sort_1",
          userId: "user_1"
        },
        createDeveloperToken,
        decryptUserToken,
        createLibraryPlaylist,
        addTracksToPlaylist,
        trackBatchSize: 2
      })
    ).resolves.toEqual({
      createdCount: 1,
      skippedCount: 1,
      playlistTrackCount: 4,
      trackBatchCount: 3,
      failedCount: 0
    });

    expect(createDeveloperToken).toHaveBeenCalledOnce();
    expect(decryptUserToken).toHaveBeenCalledWith("encrypted-token");
    expect(createLibraryPlaylist).toHaveBeenCalledWith(
      {
        developerToken: "developer-token",
        musicUserToken: "music-user-token",
        storefront: "us"
      },
      expect.objectContaining({
        id: "sort_playlist_1",
        title: "Ukrainian Rap"
      })
    );
    expect(store.setApplePlaylistId).toHaveBeenCalledWith({
      sortRunId: "sort_1",
      sortPlaylistId: "sort_playlist_1",
      applePlaylistId: "p.created"
    });
    expect(store.markPlaylistTracksExported).toHaveBeenCalledWith({
      sortRunId: "sort_1",
      sortPlaylistId: "sort_playlist_1",
      applePlaylistId: "p.created"
    });
    expect(store.markPlaylistTracksExported).toHaveBeenCalledWith({
      sortRunId: "sort_1",
      sortPlaylistId: "sort_playlist_2",
      applePlaylistId: "p.existing"
    });
    expect(addTracksToPlaylist).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        developerToken: "developer-token",
        musicUserToken: "music-user-token"
      }),
      "p.created",
      [
        { id: "apple_1", type: "library-songs" },
        { id: "apple_2", type: "library-songs" }
      ]
    );
    expect(addTracksToPlaylist).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      "p.created",
      [{ id: "apple_3", type: "library-songs" }]
    );
    expect(addTracksToPlaylist).toHaveBeenNthCalledWith(
      3,
      expect.any(Object),
      "p.existing",
      [{ id: "apple_4", type: "library-songs" }]
    );
    expect(store.markSortRunFailed).not.toHaveBeenCalled();
    expect(store.markSortRunCompleted).toHaveBeenCalledWith({
      sortRunId: "sort_1",
      userId: "user_1"
    });
  });

  it("records partial failures while preserving successful created playlist IDs", async () => {
    const store = createStore({
      async listSelectedPlaylists() {
        return [
          {
            id: "sort_playlist_1",
            title: "Ukrainian Rap",
            description: "Ukrainian rap tracks.",
            applePlaylistId: null,
            tracks: [
              {
                normalizedTrackId: "track_1",
                appleSongId: "apple_1",
                position: 1
              }
            ]
          },
          {
            id: "sort_playlist_2",
            title: "Gym Rap",
            description: "Workout rap tracks.",
            applePlaylistId: null,
            tracks: [
              {
                normalizedTrackId: "track_2",
                appleSongId: "apple_2",
                position: 1
              }
            ]
          }
        ];
      }
    });
    const createLibraryPlaylist = vi
      .fn()
      .mockRejectedValueOnce(new Error("Apple Music rate limit."))
      .mockResolvedValueOnce({ id: "p.created" });
    const addTracksToPlaylist = vi.fn(async () => undefined);

    await expect(
      handlePlaylistCreationJob({
        store,
        data: {
          sortRunId: "sort_1",
          userId: "user_1"
        },
        createDeveloperToken: vi.fn(async () => ({
          developerToken: "developer-token",
          expiresAt: "2026-05-22T20:30:00.000Z"
        })),
        decryptUserToken: vi.fn(() => "music-user-token"),
        createLibraryPlaylist,
        addTracksToPlaylist
      })
    ).rejects.toThrow("Failed to write back 1 Apple Music playlists.");

    expect(store.setApplePlaylistId).toHaveBeenCalledWith({
      sortRunId: "sort_1",
      sortPlaylistId: "sort_playlist_2",
      applePlaylistId: "p.created"
    });
    expect(store.markPlaylistTracksExported).toHaveBeenCalledWith({
      sortRunId: "sort_1",
      sortPlaylistId: "sort_playlist_2",
      applePlaylistId: "p.created"
    });
    expect(store.markSortRunFailed).toHaveBeenCalledWith({
      sortRunId: "sort_1",
      userId: "user_1",
      errorSummary: "Failed to write back 1 Apple Music playlists."
    });
    expect(store.createJobEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sortRunId: "sort_1",
        stage: "playlist_creation",
        level: "error",
        message: 'Failed to create "Ukrainian Rap": Apple Music rate limit.'
      })
    );
  });

  it("records failures when track insertion fails after playlist creation", async () => {
    const store = createStore();
    const addTracksToPlaylist = vi
      .fn()
      .mockRejectedValueOnce(new Error("Track unavailable."))
      .mockResolvedValueOnce(undefined);

    await expect(
      handlePlaylistCreationJob({
        store,
        data: {
          sortRunId: "sort_1",
          userId: "user_1"
        },
        createDeveloperToken: vi.fn(async () => ({
          developerToken: "developer-token",
          expiresAt: "2026-05-22T20:30:00.000Z"
        })),
        decryptUserToken: vi.fn(() => "music-user-token"),
        createLibraryPlaylist: vi.fn(async () => ({ id: "p.created" })),
        addTracksToPlaylist
      })
    ).rejects.toThrow("Failed to write back 1 Apple Music playlists.");

    expect(store.setApplePlaylistId).toHaveBeenCalledWith({
      sortRunId: "sort_1",
      sortPlaylistId: "sort_playlist_1",
      applePlaylistId: "p.created"
    });
    expect(store.markPlaylistTracksExported).not.toHaveBeenCalledWith({
      sortRunId: "sort_1",
      sortPlaylistId: "sort_playlist_1",
      applePlaylistId: "p.created"
    });
    expect(store.markSortRunCompleted).not.toHaveBeenCalled();
    expect(store.markSortRunFailed).toHaveBeenCalledWith({
      sortRunId: "sort_1",
      userId: "user_1",
      errorSummary: "Failed to write back 1 Apple Music playlists."
    });
    expect(store.createJobEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "error",
        message: 'Failed to add tracks to "Ukrainian Rap": Track unavailable.'
      })
    );
  });

  it("marks app export state exported when no addable Apple song IDs remain", async () => {
    const store = createStore({
      async listSelectedPlaylists() {
        return [
          {
            id: "sort_playlist_1",
            title: "Local Files",
            description: "Tracks without Apple song IDs.",
            applePlaylistId: null,
            tracks: [
              {
                normalizedTrackId: "track_1",
                appleSongId: null,
                position: 1
              }
            ]
          }
        ];
      }
    });
    const addTracksToPlaylist = vi.fn(async () => undefined);

    await expect(
      handlePlaylistCreationJob({
        store,
        data: {
          sortRunId: "sort_1",
          userId: "user_1"
        },
        createDeveloperToken: vi.fn(async () => ({
          developerToken: "developer-token",
          expiresAt: "2026-05-22T20:30:00.000Z"
        })),
        decryptUserToken: vi.fn(() => "music-user-token"),
        createLibraryPlaylist: vi.fn(async () => ({ id: "p.created" })),
        addTracksToPlaylist
      })
    ).resolves.toEqual({
      createdCount: 1,
      skippedCount: 0,
      playlistTrackCount: 0,
      trackBatchCount: 0,
      failedCount: 0
    });

    expect(addTracksToPlaylist).not.toHaveBeenCalled();
    expect(store.markPlaylistTracksExported).toHaveBeenCalledWith({
      sortRunId: "sort_1",
      sortPlaylistId: "sort_playlist_1",
      applePlaylistId: "p.created"
    });
  });

  it("fails before Apple calls when no encrypted user token is available", async () => {
    const store = createStore({
      async getConnectedAppleMusicConnection() {
        return {
          id: "connection_1",
          status: "connected",
          storefront: "us"
        };
      }
    });
    const createLibraryPlaylist = vi.fn(async () => ({ id: "p.created" }));

    await expect(
      handlePlaylistCreationJob({
        store,
        data: {
          sortRunId: "sort_1",
          userId: "user_1"
        },
        createLibraryPlaylist
      })
    ).rejects.toThrow("Connected Apple Music token is unavailable.");
    expect(createLibraryPlaylist).not.toHaveBeenCalled();
    expect(store.markSortRunFailed).toHaveBeenCalledWith({
      sortRunId: "sort_1",
      userId: "user_1",
      errorSummary: "Connected Apple Music token is unavailable."
    });
  });
});
