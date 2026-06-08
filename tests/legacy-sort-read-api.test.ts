import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/sort-runs/[id]/route";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabasePreviewSnapshotStore } from "@/modules/sorts/preview-snapshot";

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedSession: vi.fn()
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseServiceRoleClient: vi.fn()
}));

vi.mock("@/modules/sorts/preview-snapshot", () => ({
  createSupabasePreviewSnapshotStore: vi.fn()
}));

const authMock = vi.mocked(getAuthenticatedSession);
const serviceRoleMock = vi.mocked(createSupabaseServiceRoleClient);
const previewStoreMock = vi.mocked(createSupabasePreviewSnapshotStore);

describe("GET /api/sort-runs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      status: "authenticated",
      user: { id: "user_1" },
      supabase: null
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);
    serviceRoleMock.mockReturnValue({} as ReturnType<typeof createSupabaseServiceRoleClient>);
    previewStoreMock.mockReturnValue({
      getSortRunForPreview: vi.fn().mockResolvedValue({
        id: "sort_1",
        userId: "user_1",
        librarySyncId: "sync_1",
        state: "preview_ready",
        paymentStatus: "pending",
        previewSnapshot: { playlists: [] },
        requests: []
      })
    } as never);
  });

  it("requires an authenticated user", async () => {
    authMock.mockResolvedValueOnce({
      status: "signed_out",
      user: null,
      supabase: null
    });

    const response = await GET(new Request("http://test.local"), {
      params: Promise.resolve({ id: "sort_1" })
    });

    await expect(response.json()).resolves.toEqual({ error: "Sign in required." });
    expect(response.status).toBe(401);
  });

  it("returns legacy read data with platform route guidance", async () => {
    const response = await GET(new Request("http://test.local"), {
      params: Promise.resolve({ id: "sort_1" })
    });

    await expect(response.json()).resolves.toEqual({
      sortRunId: "sort_1",
      state: "preview_ready",
      paymentStatus: "pending",
      nextPath: "/app/sorts/sort_1",
      nextApiPath: "/api/app/sorts/sort_1",
      previewSnapshot: { playlists: [] },
      playlistRequests: []
    });
    expect(response.status).toBe(200);
  });
});
