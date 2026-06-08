import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/apple/connect/route";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { withPgBoss } from "@/lib/pg-boss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { persistAppleMusicUserToken } from "@/modules/apple-music/auth";
import {
  createSupabaseLibrarySyncStore,
  queueLibrarySyncAfterConnection
} from "@/modules/library-syncs/queue";

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedSession: vi.fn()
}));

vi.mock("@/lib/pg-boss", () => ({
  withPgBoss: vi.fn()
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseServiceRoleClient: vi.fn()
}));

vi.mock("@/modules/apple-music/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/apple-music/auth")>();

  return {
    ...actual,
    persistAppleMusicUserToken: vi.fn()
  };
});

vi.mock("@/modules/library-syncs/queue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/library-syncs/queue")>();

  return {
    ...actual,
    createSupabaseLibrarySyncStore: vi.fn(),
    queueLibrarySyncAfterConnection: vi.fn()
  };
});

const authMock = vi.mocked(getAuthenticatedSession);
const withPgBossMock = vi.mocked(withPgBoss);
const serviceRoleMock = vi.mocked(createSupabaseServiceRoleClient);
const persistTokenMock = vi.mocked(persistAppleMusicUserToken);
const syncStoreMock = vi.mocked(createSupabaseLibrarySyncStore);
const queueAfterConnectionMock = vi.mocked(queueLibrarySyncAfterConnection);

describe("POST /api/apple/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      status: "authenticated",
      user: { id: "user_1", email: "user@example.com" },
      supabase: null
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);
    serviceRoleMock.mockReturnValue({} as ReturnType<typeof createSupabaseServiceRoleClient>);
    persistTokenMock.mockResolvedValue({
      status: "connected",
      connectionId: "connection_1",
      userId: "user_1",
      storefront: "ua",
      encryptedUserToken: "encrypted-token",
      tokenEncryptionVersion: 1,
      lastValidatedAt: "2026-06-08T10:00:00.000Z",
      updatedAt: "2026-06-08T10:00:00.000Z"
    });
    syncStoreMock.mockReturnValue({ store: "library-sync" } as never);
    withPgBossMock.mockImplementation(async (callback) => callback({ queue: true } as never));
    queueAfterConnectionMock.mockResolvedValue({
      status: "queued",
      sync: {
        id: "sync_1",
        userId: "user_1",
        status: "queued",
        rawTrackCount: 0,
        normalizedTrackCount: 0,
        duplicateCount: 0,
        errorSummary: null,
        createdAt: "2026-06-08T10:00:00.000Z",
        updatedAt: "2026-06-08T10:00:00.000Z"
      },
      jobId: "job_1"
    });
  });

  it("stores the MusicKit token and queues the first library sync without returning the token", async () => {
    const response = await POST(
      new Request("http://test.local/api/apple/connect", {
        method: "POST",
        body: JSON.stringify({
          musicUserToken: "secret-music-user-token",
          storefront: "ua"
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "connected",
      storefront: "ua",
      autoSync: {
        status: "queued",
        syncId: "sync_1",
        jobId: "job_1"
      }
    });
    expect(JSON.stringify(body)).not.toContain("secret-music-user-token");
    expect(persistTokenMock).toHaveBeenCalledWith({
      supabase: {},
      userId: "user_1",
      musicUserToken: "secret-music-user-token",
      storefront: "ua"
    });
    expect(queueAfterConnectionMock).toHaveBeenCalledWith({
      store: { store: "library-sync" },
      queue: { queue: true },
      userId: "user_1"
    });
  });

  it("keeps Apple Music connect successful when the sync queue is unavailable", async () => {
    withPgBossMock.mockResolvedValueOnce(null);

    const response = await POST(
      new Request("http://test.local/api/apple/connect", {
        method: "POST",
        body: JSON.stringify({
          musicUserToken: "secret-music-user-token",
          storefront: "gb"
        })
      })
    );

    await expect(response.json()).resolves.toEqual({
      status: "connected",
      storefront: "gb",
      autoSync: {
        status: "unavailable"
      }
    });
    expect(response.status).toBe(200);
  });
});
