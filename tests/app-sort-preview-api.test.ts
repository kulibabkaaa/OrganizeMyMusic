import { describe, expect, it, vi, beforeEach } from "vitest";

import { POST } from "@/app/api/app/sorts/[sortId]/preview/route";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabaseSortDraftStore } from "@/modules/sorts/drafts";
import { generateAndStoreLightweightPreview } from "@/modules/sorts/lightweight-preview";

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedSession: vi.fn()
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseServiceRoleClient: vi.fn()
}));

vi.mock("@/modules/sorts/drafts", () => ({
  createSupabaseSortDraftStore: vi.fn(),
  getPreviewReadiness: vi.fn((status: string | null) =>
    status === "completed"
      ? { canPreview: true, disabledReason: null }
      : {
          canPreview: false,
          disabledReason: status
            ? "Library sync must finish before previewing this Sort."
            : "Connect and sync Apple Music before previewing this Sort."
        }
  )
}));

vi.mock("@/modules/sorts/lightweight-preview", () => ({
  createSupabaseLightweightPreviewStore: vi.fn(() => ({ store: "preview" })),
  generateAndStoreLightweightPreview: vi.fn()
}));

const authMock = vi.mocked(getAuthenticatedSession);
const serviceRoleMock = vi.mocked(createSupabaseServiceRoleClient);
const draftStoreMock = vi.mocked(createSupabaseSortDraftStore);
const previewMock = vi.mocked(generateAndStoreLightweightPreview);

const sort = {
  id: "33333333-3333-4333-8333-333333333333",
  userId: "user_1",
  librarySyncId: "11111111-1111-4111-8111-111111111111",
  name: "My Apple Music cleanup",
  sourceProvider: "apple_music" as const,
  state: "draft" as const,
  paymentStatus: "pending" as const,
  createdAt: "2026-05-26T10:00:00.000Z",
  updatedAt: "2026-05-26T10:00:00.000Z"
};

describe("POST /api/app/sorts/[sortId]/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      status: "authenticated",
      user: { id: "user_1" },
      supabase: null
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);
    serviceRoleMock.mockReturnValue({} as ReturnType<typeof createSupabaseServiceRoleClient>);
    draftStoreMock.mockReturnValue({
      async getSortDraft() {
        return sort;
      },
      async getLibrarySyncForUser() {
        return { id: sort.librarySyncId, status: "completed" };
      },
      async createSortDraft() {
        throw new Error("not used");
      },
      async updateSortDraft() {
        throw new Error("not used");
      }
    });
    previewMock.mockResolvedValue({
      status: "created",
      snapshot: {
        sortRunId: sort.id,
        librarySyncId: sort.librarySyncId,
        generatedAt: "2026-05-26T12:00:00.000Z",
        playlists: []
      }
    });
  });

  it("requires an authenticated user", async () => {
    authMock.mockResolvedValueOnce({
      status: "signed_out",
      user: null,
      supabase: null
    });

    const response = await POST(new Request("http://test.local"), {
      params: Promise.resolve({ sortId: sort.id })
    });

    await expect(response.json()).resolves.toEqual({ error: "Sign in required." });
    expect(response.status).toBe(401);
  });

  it("generates a lightweight preview only after the library sync is completed", async () => {
    const response = await POST(new Request("http://test.local"), {
      params: Promise.resolve({ sortId: sort.id })
    });

    await expect(response.json()).resolves.toMatchObject({
      status: "created",
      previewSnapshot: {
        sortRunId: sort.id,
        librarySyncId: sort.librarySyncId
      }
    });
    expect(response.status).toBe(200);
    expect(previewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sortRunId: sort.id,
        userId: "user_1"
      })
    );
  });

  it("returns a recoverable error when preview readiness is blocked", async () => {
    draftStoreMock.mockReturnValueOnce({
      async getSortDraft() {
        return { ...sort, librarySyncId: null };
      },
      async getLibrarySyncForUser() {
        return null;
      },
      async createSortDraft() {
        throw new Error("not used");
      },
      async updateSortDraft() {
        throw new Error("not used");
      }
    });

    const response = await POST(new Request("http://test.local"), {
      params: Promise.resolve({ sortId: sort.id })
    });

    await expect(response.json()).resolves.toEqual({
      error: "Connect and sync Apple Music before previewing this Sort."
    });
    expect(response.status).toBe(409);
    expect(previewMock).not.toHaveBeenCalled();
  });
});
