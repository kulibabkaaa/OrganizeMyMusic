import { beforeEach, describe, expect, it, vi } from "vitest";

import SortCheckoutRedirectPage from "@/app/(app)/app/sorts/[sortId]/checkout/page";
import AppSortStatusPage from "@/app/(app)/app/sorts/[sortId]/page";
import LegacySortRunPage from "@/app/(app)/sorts/[id]/page";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getSortPreview } from "@/modules/sorts/service";

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  })
}));

vi.mock("next/navigation", () => navigation);

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedSession: vi.fn()
}));

vi.mock("@/modules/sorts/service", () => ({
  getSortPreview: vi.fn()
}));

const authMock = vi.mocked(getAuthenticatedSession);
const previewMock = vi.mocked(getSortPreview);

describe("/app/sorts/[sortId] status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      status: "authenticated",
      user: { id: "user_1", email: "user@example.com" },
      supabase: null
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);
  });

  it("keeps non-ready Sorts inside canonical app routes", async () => {
    previewMock.mockResolvedValueOnce({
      status: "missing_config"
    });

    await expect(
      AppSortStatusPage({
        params: Promise.resolve({ sortId: "sort_1" })
      })
    ).rejects.toThrow("NEXT_REDIRECT:/app/sorts/sort_1/builder");

    expect(navigation.redirect).toHaveBeenCalledWith("/app/sorts/sort_1/builder");
    expect(navigation.redirect).not.toHaveBeenCalledWith("/sorts/sort_1");
  });

  it("redirects ready Sorts to their platform lifecycle route", async () => {
    previewMock.mockResolvedValueOnce({
      status: "ready",
      sortRun: {
        id: "sort_1",
        userId: "user_1",
        librarySyncId: "sync_1",
        state: "preview_ready",
        paymentStatus: "pending",
        previewSnapshot: {
          sortRunId: "sort_1",
          librarySyncId: "sync_1",
          generatedAt: "2026-06-08T10:00:00.000Z",
          playlists: []
        },
        requests: [],
        events: []
      }
    });

    await expect(
      AppSortStatusPage({
        params: Promise.resolve({ sortId: "sort_1" })
      })
    ).rejects.toThrow("NEXT_REDIRECT:/app/sorts/sort_1/preview");
  });
});

describe("/sorts/[id] compatibility route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects old Sort links into the canonical app workflow", async () => {
    await expect(
      LegacySortRunPage({
        params: Promise.resolve({ id: "sort_1" })
      })
    ).rejects.toThrow("NEXT_REDIRECT:/app/sorts/sort_1");

    expect(navigation.redirect).toHaveBeenCalledWith("/app/sorts/sort_1");
  });
});

describe("/app/sorts/[sortId]/checkout compatibility route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects old checkout links into the canonical full-organization start route", async () => {
    await expect(
      SortCheckoutRedirectPage({
        params: Promise.resolve({ sortId: "sort_1" })
      })
    ).rejects.toThrow("NEXT_REDIRECT:/app/sorts/sort_1/start");

    expect(navigation.redirect).toHaveBeenCalledWith("/app/sorts/sort_1/start");
  });
});
