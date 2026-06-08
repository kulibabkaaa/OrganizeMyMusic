import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/apple/connection/route";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getAppleMusicConnectionStatus } from "@/modules/apple-music/auth";

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedSession: vi.fn()
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseServiceRoleClient: vi.fn()
}));

vi.mock("@/modules/apple-music/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/apple-music/auth")>();

  return {
    ...actual,
    getAppleMusicConnectionStatus: vi.fn()
  };
});

const authMock = vi.mocked(getAuthenticatedSession);
const serviceRoleMock = vi.mocked(createSupabaseServiceRoleClient);
const connectionStatusMock = vi.mocked(getAppleMusicConnectionStatus);

describe("GET /api/apple/connection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      status: "authenticated",
      user: { id: "user_1", email: "user@example.com" },
      supabase: null
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);
    serviceRoleMock.mockReturnValue({} as ReturnType<typeof createSupabaseServiceRoleClient>);
    connectionStatusMock.mockResolvedValue({
      status: "connected",
      connectionId: "connection_1",
      userId: "user_1",
      storefront: "us",
      lastValidatedAt: "2026-06-08T10:00:00.000Z",
      updatedAt: "2026-06-08T10:00:00.000Z"
    });
  });

  it("requires authentication", async () => {
    authMock.mockResolvedValueOnce({
      status: "signed_out",
      user: null,
      supabase: null
    });

    const response = await GET();

    await expect(response.json()).resolves.toEqual({ error: "Sign in required." });
    expect(response.status).toBe(401);
  });

  it("returns current Apple Music connection status without token fields", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "connected",
      storefront: "us",
      lastValidatedAt: "2026-06-08T10:00:00.000Z",
      updatedAt: "2026-06-08T10:00:00.000Z"
    });
    expect(JSON.stringify(body)).not.toContain("token");
    expect(connectionStatusMock).toHaveBeenCalledWith({
      supabase: {},
      userId: "user_1"
    });
  });

  it("returns disconnected when no Apple Music connection exists", async () => {
    connectionStatusMock.mockResolvedValueOnce({
      status: "disconnected",
      connectionId: null,
      userId: "user_1",
      storefront: null,
      lastValidatedAt: null,
      updatedAt: null
    });

    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      status: "disconnected",
      storefront: null,
      lastValidatedAt: null,
      updatedAt: null
    });
    expect(response.status).toBe(200);
  });
});
