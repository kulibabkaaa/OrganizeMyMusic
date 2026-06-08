import { describe, expect, it, vi } from "vitest";

import {
  exportPlaylistGenerationToAppleMusic,
  PLAYLIST_GENERATION_EXPORT_JOB_NAME,
  queuePlaylistGenerationExport,
  type PlaylistGenerationExportStore
} from "@/modules/playlists/generation-export";

const store: PlaylistGenerationExportStore = {
  getPlaylist: vi.fn(async () => ({
    id: "playlist_1",
    user_id: "user_1",
    name: "Ukrainian Rap",
    description: "High energy.",
    apple_playlist_id: null
  })),
  getGeneration: vi.fn(async () => ({
    id: "generation_1",
    user_id: "user_1",
    playlist_id: "playlist_1",
    status: "reviewed" as const
  })),
  getConnectedAppleMusicConnection: vi.fn(async () => ({
    id: "connection_1",
    status: "connected" as const,
    storefront: "us",
    encryptedUserToken: "encrypted_token"
  })),
  listKeptTracks: vi.fn(async () => [
    {
      appleSongId: "song_1",
      position: 0
    },
    {
      appleSongId: null,
      position: 1
    }
  ]),
  createExportRow: vi.fn(async () => "export_1"),
  markExporting: vi.fn(),
  markExported: vi.fn(),
  markFailed: vi.fn()
};

describe("playlist generation export", () => {
  it("queues reviewed playlist generation exports through pg-boss", async () => {
    vi.clearAllMocks();
    const queue = {
      createQueue: vi.fn(),
      send: vi.fn(async () => "job_1")
    };

    const result = await queuePlaylistGenerationExport({
      store,
      queue,
      userId: "user_1",
      playlistId: "playlist_1",
      generationId: "generation_1"
    });

    expect(result).toEqual({
      status: "queued",
      playlistId: "playlist_1",
      generationId: "generation_1",
      exportId: "export_1",
      selectedTrackCount: 1,
      jobId: "job_1"
    });
    expect(queue.createQueue).toHaveBeenCalledWith(PLAYLIST_GENERATION_EXPORT_JOB_NAME);
    expect(store.markExporting).toHaveBeenCalledWith({
      generationId: "generation_1",
      exportId: "export_1"
    });
    expect(queue.send).toHaveBeenCalledWith(
      PLAYLIST_GENERATION_EXPORT_JOB_NAME,
      {
        userId: "user_1",
        playlistId: "playlist_1",
        generationId: "generation_1",
        exportId: "export_1"
      },
      expect.objectContaining({
        singletonKey: "generation_1"
      })
    );
  });

  it("does not create an export row or queue a job before reviewable state", async () => {
    vi.clearAllMocks();
    vi.mocked(store.getGeneration).mockResolvedValueOnce({
      id: "generation_1",
      user_id: "user_1",
      playlist_id: "playlist_1",
      status: "failed" as const
    });
    const queue = {
      createQueue: vi.fn(),
      send: vi.fn(async () => "job_1")
    };

    const result = await queuePlaylistGenerationExport({
      store,
      queue,
      userId: "user_1",
      playlistId: "playlist_1",
      generationId: "generation_1"
    });

    expect(result).toEqual({
      status: "invalid_state",
      message: "Review the generated playlist before export."
    });
    expect(store.createExportRow).not.toHaveBeenCalled();
    expect(store.markExporting).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });

  it("does not create an export row or queue a job before track review is saved", async () => {
    vi.clearAllMocks();
    vi.mocked(store.getGeneration).mockResolvedValueOnce({
      id: "generation_1",
      user_id: "user_1",
      playlist_id: "playlist_1",
      status: "ready_for_review" as const
    });
    const queue = {
      createQueue: vi.fn(),
      send: vi.fn(async () => "job_1")
    };

    const result = await queuePlaylistGenerationExport({
      store,
      queue,
      userId: "user_1",
      playlistId: "playlist_1",
      generationId: "generation_1"
    });

    expect(result).toEqual({
      status: "invalid_state",
      message: "Review the generated playlist before export."
    });
    expect(store.createExportRow).not.toHaveBeenCalled();
    expect(store.markExporting).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });

  it("creates an Apple Music playlist and adds only approved addable tracks", async () => {
    vi.clearAllMocks();
    const createLibraryPlaylist = vi.fn(async () => ({ id: "apple_playlist_1" }));
    const addTracksToPlaylist = vi.fn(async () => undefined);

    const result = await exportPlaylistGenerationToAppleMusic({
      store,
      userId: "user_1",
      playlistId: "playlist_1",
      generationId: "generation_1",
      createDeveloperToken: vi.fn(async () => ({
        developerToken: "developer_token",
        expiresAt: "2026-06-09T00:00:00.000Z"
      })),
      decryptUserToken: vi.fn(() => "music_user_token"),
      createLibraryPlaylist,
      addTracksToPlaylist
    });

    expect(result).toEqual({
      status: "exported",
      playlistId: "playlist_1",
      generationId: "generation_1",
      applePlaylistId: "apple_playlist_1",
      selectedTrackCount: 1
    });
    expect(createLibraryPlaylist).toHaveBeenCalledWith(
      expect.objectContaining({
        developerToken: "developer_token",
        musicUserToken: "music_user_token"
      }),
      {
        name: "Ukrainian Rap",
        description: "High energy."
      }
    );
    expect(addTracksToPlaylist).toHaveBeenCalledWith(
      expect.any(Object),
      "apple_playlist_1",
      [{ id: "song_1", type: "library-songs" }]
    );
    expect(store.markExported).toHaveBeenCalledWith({
      playlistId: "playlist_1",
      generationId: "generation_1",
      exportId: "export_1",
      applePlaylistId: "apple_playlist_1"
    });
  });

  it("blocks export when no kept Apple Music tracks are available", async () => {
    vi.clearAllMocks();
    vi.mocked(store.listKeptTracks).mockResolvedValueOnce([
      {
        appleSongId: null,
        position: 0
      }
    ]);

    const result = await exportPlaylistGenerationToAppleMusic({
      store,
      userId: "user_1",
      playlistId: "playlist_1",
      generationId: "generation_1"
    });

    expect(result).toEqual({
      status: "empty_selection",
      message: "Keep at least one Apple Music library track before export."
    });
    expect(store.createExportRow).not.toHaveBeenCalled();
  });

  it("stores privacy-safe failure summaries when Apple Music export fails", async () => {
    vi.clearAllMocks();

    await expect(
      exportPlaylistGenerationToAppleMusic({
        store,
        userId: "user_1",
        playlistId: "playlist_1",
        generationId: "generation_1",
        createDeveloperToken: vi.fn(async () => ({
          developerToken: "developer_token",
          expiresAt: "2026-06-09T00:00:00.000Z"
        })),
        decryptUserToken: vi.fn(() => "raw-music-user-token"),
        createLibraryPlaylist: vi.fn(async () => ({ id: "apple_playlist_1" })),
        addTracksToPlaylist: vi.fn(async () => {
          throw new Error("Apple Music raw-music-user-token rejected Kyiv Night by Artist.");
        })
      })
    ).rejects.toThrow("Apple Music raw-music-user-token rejected Kyiv Night by Artist.");

    expect(store.markFailed).toHaveBeenCalledWith({
      generationId: "generation_1",
      exportId: "export_1",
      errorSummary: "Playlist generation export failed. Failure category: authentication."
    });
    expect(JSON.stringify(vi.mocked(store.markFailed).mock.calls)).not.toContain(
      "raw-music-user-token"
    );
    expect(JSON.stringify(vi.mocked(store.markFailed).mock.calls)).not.toContain("Kyiv Night");
  });
});
