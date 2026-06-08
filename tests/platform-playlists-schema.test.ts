import { describe, expect, it } from "vitest";

import { playlistCreateSchema, playlistUpdateSchema } from "@/modules/playlists/schema";
import { mapPlaylistRow } from "@/modules/playlists/store";

describe("platform playlists", () => {
  it("normalizes create payloads for persistent playlists", () => {
    expect(
      playlistCreateSchema.parse({
        name: "  Ukrainian Rap  ",
        description: "  High energy library cuts  "
      })
    ).toEqual({
      name: "Ukrainian Rap",
      description: "High energy library cuts",
      sourceProvider: "apple_music"
    });
  });

  it("validates update payloads without requiring every field", () => {
    expect(
      playlistUpdateSchema.parse({
        description: "",
        status: "active",
        applePlaylistId: "p.123"
      })
    ).toEqual({
      description: null,
      status: "active",
      applePlaylistId: "p.123"
    });
  });

  it("maps database rows into domain playlists", () => {
    expect(
      mapPlaylistRow({
        id: "playlist_1",
        user_id: "user_1",
        source_provider: "apple_music",
        name: "Deep Work",
        description: null,
        status: "draft",
        apple_playlist_id: null,
        created_from_sort_run_id: "sort_1",
        latest_library_sync_id: "sync_1",
        last_processed_new_music_sync_id: "sync_1",
        last_generated_at: null,
        last_exported_at: null,
        created_at: "2026-06-08T10:00:00.000Z",
        updated_at: "2026-06-08T10:00:00.000Z",
        archived_at: null
      })
    ).toMatchObject({
      id: "playlist_1",
      userId: "user_1",
      name: "Deep Work",
      status: "draft",
      createdFromSortRunId: "sort_1",
      lastProcessedNewMusicSyncId: "sync_1"
    });
  });
});
