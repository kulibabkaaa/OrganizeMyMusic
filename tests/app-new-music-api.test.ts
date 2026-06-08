import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/app/new-music/process/route";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseNewMusicStore,
  processNewMusic
} from "@/modules/library-syncs/new-music";

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedSession: vi.fn()
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseServiceRoleClient: vi.fn()
}));

vi.mock("@/modules/library-syncs/new-music", () => ({
  createSupabaseNewMusicStore: vi.fn(),
  processNewMusic: vi.fn()
}));

const authMock = vi.mocked(getAuthenticatedSession);
const serviceRoleMock = vi.mocked(createSupabaseServiceRoleClient);
const storeFactoryMock = vi.mocked(createSupabaseNewMusicStore);
const processNewMusicMock = vi.mocked(processNewMusic);

describe("POST /api/app/new-music/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      status: "authenticated",
      user: { id: "user_1" },
      supabase: null
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);
    serviceRoleMock.mockReturnValue({ supabase: true } as unknown as ReturnType<typeof createSupabaseServiceRoleClient>);
    storeFactoryMock.mockReturnValue({ store: "new-music" } as unknown as ReturnType<typeof createSupabaseNewMusicStore>);
    processNewMusicMock.mockResolvedValue({
      status: "processed",
      summary: {
        latestSyncId: "sync_latest",
        previousSyncId: "sync_previous",
        newTrackCount: 1,
        canProcess: true,
        message: "1 new song detected since the previous sync."
      },
      recommendations: []
    });
  });

  it("requires an authenticated user", async () => {
    authMock.mockResolvedValueOnce({
      status: "signed_out",
      user: null,
      supabase: null
    });

    const response = await POST();

    await expect(response.json()).resolves.toEqual({ error: "Sign in required." });
    expect(response.status).toBe(401);
  });

  it("returns service configuration errors without processing", async () => {
    serviceRoleMock.mockReturnValueOnce(null);

    const response = await POST();

    await expect(response.json()).resolves.toEqual({
      error: "New music processing is not configured."
    });
    expect(response.status).toBe(503);
    expect(processNewMusicMock).not.toHaveBeenCalled();
  });

  it("returns review-only recommendations for the authenticated user", async () => {
    const response = await POST();

    await expect(response.json()).resolves.toMatchObject({
      status: "processed",
      summary: {
        newTrackCount: 1
      },
      recommendations: []
    });
    expect(response.status).toBe(200);
    expect(storeFactoryMock).toHaveBeenCalledWith({ supabase: true });
    expect(processNewMusicMock).toHaveBeenCalledWith({
      store: { store: "new-music" },
      userId: "user_1"
    });
  });

  it("returns conflict when new music cannot be processed yet", async () => {
    processNewMusicMock.mockResolvedValueOnce({
      status: "not_ready",
      summary: {
        latestSyncId: null,
        previousSyncId: null,
        newTrackCount: 0,
        canProcess: false,
        message: "Complete a library sync before processing new music."
      },
      recommendations: [],
      message: "Complete a library sync before processing new music."
    });

    const response = await POST();

    await expect(response.json()).resolves.toEqual({
      status: "not_ready",
      summary: {
        latestSyncId: null,
        previousSyncId: null,
        newTrackCount: 0,
        canProcess: false,
        message: "Complete a library sync before processing new music."
      },
      recommendations: [],
      message: "Complete a library sync before processing new music."
    });
    expect(response.status).toBe(409);
  });

  it("returns no-playlists without treating the request as an API error", async () => {
    processNewMusicMock.mockResolvedValueOnce({
      status: "no_playlists",
      summary: {
        latestSyncId: "sync_latest",
        previousSyncId: "sync_previous",
        newTrackCount: 3,
        canProcess: true,
        message: "3 new songs detected since the previous sync."
      },
      recommendations: [],
      message: "Create at least one saved playlist before processing new music."
    });

    const response = await POST();

    await expect(response.json()).resolves.toMatchObject({
      status: "no_playlists",
      recommendations: [],
      message: "Create at least one saved playlist before processing new music."
    });
    expect(response.status).toBe(200);
  });

  it("returns no-matches without treating the request as an API error", async () => {
    processNewMusicMock.mockResolvedValueOnce({
      status: "no_matches",
      summary: {
        latestSyncId: "sync_latest",
        previousSyncId: "sync_previous",
        newTrackCount: 2,
        canProcess: true,
        message: "2 new songs detected since the previous sync."
      },
      recommendations: [],
      message: "No saved playlist recipes matched the new tracks."
    });

    const response = await POST();

    await expect(response.json()).resolves.toMatchObject({
      status: "no_matches",
      recommendations: [],
      message: "No saved playlist recipes matched the new tracks."
    });
    expect(response.status).toBe(200);
  });
});
