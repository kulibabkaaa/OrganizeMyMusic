import { describe, expect, it, vi } from "vitest";

import { PLAYLIST_CREATION_JOB_NAME } from "@/modules/sorts/confirmation";
import {
  PLAYLIST_GENERATION_EXPORT_JOB_NAME,
  type PlaylistGenerationExportJobData
} from "@/modules/playlists/generation-export";
import { registerPlaylistCreationWorker } from "@/worker/playlist-creation";

const mocks = vi.hoisted(() => ({
  createSupabaseServiceRoleClient: vi.fn(() => ({ supabase: true })),
  createSupabasePlaylistCreationStore: vi.fn(() => ({ creationStore: true })),
  handlePlaylistCreationJob: vi.fn(async () => undefined),
  createSupabasePlaylistGenerationExportStore: vi.fn(() => ({ generationExportStore: true })),
  exportPlaylistGenerationToAppleMusic: vi.fn(async () => ({ status: "exported" }))
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseServiceRoleClient: mocks.createSupabaseServiceRoleClient
}));

vi.mock("@/modules/apple-music/playlist-creation", () => ({
  createSupabasePlaylistCreationStore: mocks.createSupabasePlaylistCreationStore,
  handlePlaylistCreationJob: mocks.handlePlaylistCreationJob
}));

vi.mock("@/modules/playlists/generation-export", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/playlists/generation-export")>();

  return {
    ...actual,
    createSupabasePlaylistGenerationExportStore:
      mocks.createSupabasePlaylistGenerationExportStore,
    exportPlaylistGenerationToAppleMusic: mocks.exportPlaylistGenerationToAppleMusic
  };
});

describe("playlist creation worker", () => {
  it("registers both sort playlist creation and individual playlist export queues", async () => {
    const handlers = new Map<string, (jobs: Array<{ data: unknown }>) => Promise<void>>();
    const boss = {
      createQueue: vi.fn(async () => undefined),
      work: vi.fn(async (name: string, handler: (jobs: Array<{ data: unknown }>) => Promise<void>) => {
        handlers.set(name, handler);
      })
    };

    await registerPlaylistCreationWorker(boss as never);

    expect(boss.createQueue).toHaveBeenCalledWith(PLAYLIST_CREATION_JOB_NAME);
    expect(boss.createQueue).toHaveBeenCalledWith(PLAYLIST_GENERATION_EXPORT_JOB_NAME);
    expect(boss.work).toHaveBeenCalledWith(PLAYLIST_CREATION_JOB_NAME, expect.any(Function));
    expect(boss.work).toHaveBeenCalledWith(PLAYLIST_GENERATION_EXPORT_JOB_NAME, expect.any(Function));

    const exportHandler = handlers.get(PLAYLIST_GENERATION_EXPORT_JOB_NAME);
    expect(exportHandler).toBeDefined();

    const data: PlaylistGenerationExportJobData = {
      userId: "user_1",
      playlistId: "playlist_1",
      generationId: "generation_1",
      exportId: "export_1"
    };

    await exportHandler?.([{ data }]);

    expect(mocks.createSupabasePlaylistGenerationExportStore).toHaveBeenCalledWith({
      supabase: true
    });
    expect(mocks.exportPlaylistGenerationToAppleMusic).toHaveBeenCalledWith({
      store: { generationExportStore: true },
      userId: "user_1",
      playlistId: "playlist_1",
      generationId: "generation_1",
      exportId: "export_1"
    });
  });
});
