import { describe, expect, it, vi } from "vitest";

import {
  getLibrarySyncStatus,
  handleLibrarySyncJob,
  LIBRARY_SYNC_JOB_NAME,
  queueLibrarySync,
  runRawLibrarySync,
  type LibrarySyncStore
} from "@/modules/library-syncs/queue";

function createStore(overrides: Partial<LibrarySyncStore> = {}) {
  const store: LibrarySyncStore = {
    async getConnectedAppleMusicConnection() {
      return {
        id: "connection_1",
        status: "connected",
        storefront: "us",
        encryptedUserToken: "encrypted-token"
      };
    },
    async createQueuedSync(userId: string) {
      return {
        id: "sync_1",
        userId,
        status: "queued",
        rawTrackCount: 0,
        normalizedTrackCount: 0,
        duplicateCount: 0,
        errorSummary: null,
        createdAt: "2026-05-22T00:00:00.000Z",
        updatedAt: "2026-05-22T00:00:00.000Z"
      };
    },
    createJobEvent: vi.fn(async () => undefined),
    async getSyncForUser() {
      return null;
    },
    async getLatestSyncForUser() {
      return null;
    },
    async listSyncEvents() {
      return [];
    },
    markSyncing: vi.fn(async () => undefined),
    storeRawTracks: vi.fn(async () => undefined),
    storeNormalizedTracks: vi.fn(async () => ({
      normalizedTrackIds: [],
      normalizedTracks: []
    })),
    storeTrackClassifications: vi.fn(async () => undefined),
    markNormalizedTracksStored: vi.fn(async () => undefined),
    markFailed: vi.fn(async () => undefined)
  };

  return Object.assign(store, overrides);
}

describe("queueLibrarySync", () => {
  it("creates a sync row, records an event, and queues a pg-boss job", async () => {
    const createQueue = vi.fn(async () => undefined);
    const send = vi.fn(async () => "job_1");
    const store = createStore();

    await expect(
      queueLibrarySync({
        store,
        queue: { createQueue, send },
        userId: "user_1"
      })
    ).resolves.toMatchObject({
      status: "queued",
      sync: {
        id: "sync_1",
        status: "queued"
      },
      jobId: "job_1"
    });

    expect(createQueue).toHaveBeenCalledWith(LIBRARY_SYNC_JOB_NAME);
    expect(send).toHaveBeenCalledWith(
      LIBRARY_SYNC_JOB_NAME,
      {
        syncId: "sync_1",
        userId: "user_1"
      },
      expect.objectContaining({
        retryLimit: 3
      })
    );
    expect(store.createJobEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        librarySyncId: "sync_1",
        stage: "library_sync",
        level: "info"
      })
    );
  });

  it("does not create or queue a sync without an Apple Music connection", async () => {
    const send = vi.fn(async () => "job_1");
    const createQueuedSync = vi.fn();
    const store = createStore({
      async getConnectedAppleMusicConnection() {
        return null;
      },
      createQueuedSync
    });

    await expect(
      queueLibrarySync({
        store,
        queue: { send },
        userId: "user_1"
      })
    ).resolves.toEqual({
      status: "missing_apple_music_connection"
    });

    expect(createQueuedSync).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});

describe("handleLibrarySyncJob", () => {
  it("marks a queued sync as picked up by the worker", async () => {
    const store = createStore();

    await handleLibrarySyncJob({
      store,
      createDeveloperToken: async () => ({
        developerToken: "developer-token",
        expiresAt: "2026-05-22T00:30:00.000Z"
      }),
      fetchLibrarySongs: async () => [],
      decryptUserToken: () => "raw-music-user-token",
      data: {
        syncId: "sync_1",
        userId: "user_1"
      }
    });

    expect(store.markSyncing).toHaveBeenCalledWith({
      syncId: "sync_1",
      userId: "user_1"
    });
    expect(store.createJobEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        librarySyncId: "sync_1",
        message: "Library sync worker picked up the job."
      })
    );
  });
});

describe("runRawLibrarySync", () => {
  it("fetches Apple library songs, stores raw payloads, and normalizes deduped tracks", async () => {
    const store = createStore();
    const createDeveloperToken = vi.fn(async () => ({
      developerToken: "developer-token",
      expiresAt: "2026-05-22T00:30:00.000Z"
    }));
    const fetchLibrarySongs = vi.fn(async () => [
      {
        id: "i.first",
        type: "library-songs" as const,
        attributes: {
          name: "First",
          artistName: "Artist A"
        }
      },
      {
        id: "i.second",
        type: "library-songs" as const,
        attributes: {
          name: "Second",
          artistName: "Artist B"
        }
      }
    ]);
    const decryptUserToken = vi.fn(() => "raw-music-user-token");

    await runRawLibrarySync({
      store,
      syncId: "sync_1",
      userId: "user_1",
      createDeveloperToken,
      fetchLibrarySongs,
      decryptUserToken
    });

    expect(createDeveloperToken).toHaveBeenCalledOnce();
    expect(decryptUserToken).toHaveBeenCalledWith("encrypted-token");
    expect(fetchLibrarySongs).toHaveBeenCalledWith({
      developerToken: "developer-token",
      musicUserToken: "raw-music-user-token",
      storefront: "us"
    });
    expect(store.storeRawTracks).toHaveBeenCalledWith({
      syncId: "sync_1",
      tracks: [
        expect.objectContaining({ appleSongId: "i.first" }),
        expect.objectContaining({ appleSongId: "i.second" })
      ]
    });
    expect(store.storeNormalizedTracks).toHaveBeenCalledWith({
      syncId: "sync_1",
      userId: "user_1",
      tracks: [
        expect.objectContaining({
          appleSongId: "i.first",
          normalizedName: "first",
          normalizedArtist: "artist a"
        }),
        expect.objectContaining({
          appleSongId: "i.second",
          normalizedName: "second",
          normalizedArtist: "artist b"
        })
      ]
    });
    expect(store.markNormalizedTracksStored).toHaveBeenCalledWith({
      syncId: "sync_1",
      userId: "user_1",
      rawTrackCount: 2,
      normalizedTrackCount: 2,
      duplicateCount: 0
    });
    expect(store.createJobEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        librarySyncId: "sync_1",
        level: "info",
        message: "Normalized 2 tracks and removed 0 duplicates."
      })
    );
  });

  it("stores deterministic metadata classifications for normalized tracks", async () => {
    const storeTrackClassifications = vi.fn(async () => undefined);
    const store = createStore({
      async storeNormalizedTracks(input) {
        return {
          normalizedTrackIds: ["track_1", "track_2"],
          normalizedTracks: input.tracks.map((track, index) => ({
            id: `track_${index + 1}`,
            fingerprint: track.fingerprint
          }))
        };
      }
    } as Partial<LibrarySyncStore>) as LibrarySyncStore & {
      storeTrackClassifications: typeof storeTrackClassifications;
    };
    store.storeTrackClassifications = storeTrackClassifications;
    const fetchLibrarySongs = vi.fn(async () => [
      {
        id: "i.rap",
        type: "library-songs" as const,
        attributes: {
          name: "Track",
          artistName: "Artist A",
          genreNames: ["Hip-Hop/Rap"]
        }
      },
      {
        id: "i.classical",
        type: "library-songs" as const,
        attributes: {
          name: "Piano Sonata No. 14",
          artistName: "Performer",
          genreNames: ["Classical", "Instrumental"]
        }
      }
    ]);

    await runRawLibrarySync({
      store,
      syncId: "sync_1",
      userId: "user_1",
      createDeveloperToken: vi.fn(async () => ({
        developerToken: "developer-token",
        expiresAt: "2026-05-22T00:30:00.000Z"
      })),
      fetchLibrarySongs,
      decryptUserToken: vi.fn(() => "raw-music-user-token")
    });

    expect(storeTrackClassifications).toHaveBeenCalledWith({
      classifications: [
        expect.objectContaining({
          normalizedTrackId: "track_1",
          genre: "Hip-Hop/Rap",
          source: "metadata",
          confidence: 0.86
        }),
        expect.objectContaining({
          normalizedTrackId: "track_2",
          language: "instrumental",
          genre: "Classical",
          source: "metadata",
          confidence: 0.86
        })
      ]
    });
  });

  it("marks the sync failed when Apple Music fetch fails", async () => {
    const store = createStore();
    const fetchLibrarySongs = vi.fn(async () => {
      throw new Error("Apple Music rejected the request.");
    });

    await expect(
      runRawLibrarySync({
        store,
        syncId: "sync_1",
        userId: "user_1",
        createDeveloperToken: async () => ({
          developerToken: "developer-token",
          expiresAt: "2026-05-22T00:30:00.000Z"
        }),
        fetchLibrarySongs,
        decryptUserToken: () => "raw-music-user-token"
      })
    ).rejects.toThrow("Apple Music rejected the request.");

    expect(store.markFailed).toHaveBeenCalledWith({
      syncId: "sync_1",
      userId: "user_1",
      errorSummary: "Apple Music rejected the request."
    });
    expect(store.createJobEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        librarySyncId: "sync_1",
        level: "error",
        message: "Apple Music rejected the request."
      })
    );
  });
});

describe("getLibrarySyncStatus", () => {
  it("returns a user-owned sync with events", async () => {
    const store = createStore({
      async getSyncForUser(input) {
        expect(input).toEqual({
          syncId: "sync_1",
          userId: "user_1"
        });

        return {
          id: "sync_1",
          userId: "user_1",
          status: "queued",
          rawTrackCount: 0,
          normalizedTrackCount: 0,
          duplicateCount: 0,
          errorSummary: null,
          createdAt: "2026-05-22T00:00:00.000Z",
          updatedAt: "2026-05-22T00:00:00.000Z"
        };
      },
      async listSyncEvents(syncId) {
        expect(syncId).toBe("sync_1");

        return [
          {
            id: "event_1",
            librarySyncId: "sync_1",
            stage: "library_sync",
            level: "info",
            message: "Library sync queued.",
            details: null,
            createdAt: "2026-05-22T00:00:00.000Z"
          }
        ];
      }
    });

    await expect(
      getLibrarySyncStatus({
        store,
        syncId: "sync_1",
        userId: "user_1"
      })
    ).resolves.toMatchObject({
      sync: {
        id: "sync_1",
        status: "queued"
      },
      events: [
        {
          message: "Library sync queued."
        }
      ]
    });
  });
});
