import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/sort-runs/route";
import { getAuthenticatedSession } from "@/lib/auth/session";

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedSession: vi.fn()
}));

const authMock = vi.mocked(getAuthenticatedSession);

describe("POST /api/sort-runs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      status: "authenticated",
      user: { id: "user_1" },
      supabase: null
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);
  });

  it("requires an authenticated user", async () => {
    authMock.mockResolvedValueOnce({
      status: "signed_out",
      user: null,
      supabase: null
    });

    const response = await POST(new Request("http://test.local", { method: "POST" }));

    await expect(response.json()).resolves.toEqual({ error: "Sign in required." });
    expect(response.status).toBe(401);
  });

  it("does not create legacy playlist-request Sorts", async () => {
    const response = await POST(
      new Request("http://test.local", {
        method: "POST",
        body: JSON.stringify({
          librarySyncId: "22222222-2222-4222-8222-222222222222",
          playlistRequests: ["Ukrainian rap", "Gym rap", "Sad Slavic songs"]
        })
      })
    );

    await expect(response.json()).resolves.toEqual({
      error: "Legacy playlist-request Sort creation is disabled. Create a platform Sort draft and add structured playlist recipes instead.",
      nextPath: "/app/sorts/new",
      nextApiPath: "/api/app/sorts"
    });
    expect(response.status).toBe(409);
  });
});
