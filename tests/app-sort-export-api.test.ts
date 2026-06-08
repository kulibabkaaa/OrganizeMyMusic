import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as exportPost } from "@/app/api/app/sorts/[sortId]/export/route";
import { POST as legacyCheckoutPost } from "@/app/api/sort-runs/[id]/checkout/route";
import { POST as legacyCreatePlaylistsPost } from "@/app/api/sort-runs/[id]/create-playlists/route";
import { POST as legacyConfirmPost } from "@/app/api/sort-runs/[id]/confirm/route";
import { POST as legacyRetryPost } from "@/app/api/sort-runs/[id]/retry/route";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { withPgBoss } from "@/lib/pg-boss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseSortRunExportStore,
  exportReviewedPlaylists
} from "@/modules/sorts/export-selection";
import { loadStoredFullSortReviewSnapshot } from "@/modules/sorts/full-sort-job";
import { createSupabasePreviewSnapshotStore } from "@/modules/sorts/preview-snapshot";

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedSession: vi.fn()
}));

vi.mock("@/lib/pg-boss", () => ({
  withPgBoss: vi.fn()
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseServiceRoleClient: vi.fn()
}));

vi.mock("@/modules/sorts/export-selection", () => ({
  createSupabaseSortRunExportStore: vi.fn(),
  exportReviewedPlaylists: vi.fn()
}));

vi.mock("@/modules/sorts/full-sort-job", () => ({
  loadStoredFullSortReviewSnapshot: vi.fn()
}));

vi.mock("@/modules/sorts/preview-snapshot", () => ({
  createSupabasePreviewSnapshotStore: vi.fn()
}));

const authMock = vi.mocked(getAuthenticatedSession);
const serviceRoleMock = vi.mocked(createSupabaseServiceRoleClient);
const withPgBossMock = vi.mocked(withPgBoss);
const exportMock = vi.mocked(exportReviewedPlaylists);
const exportStoreMock = vi.mocked(createSupabaseSortRunExportStore);
const fullSortSnapshotMock = vi.mocked(loadStoredFullSortReviewSnapshot);
const previewStoreMock = vi.mocked(createSupabasePreviewSnapshotStore);

describe("POST /api/app/sorts/[sortId]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      status: "authenticated",
      user: { id: "user_1" },
      supabase: null
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);
    serviceRoleMock.mockReturnValue({} as ReturnType<typeof createSupabaseServiceRoleClient>);
    withPgBossMock.mockImplementation(async (callback) => callback({ queue: true } as never));
    exportStoreMock.mockReturnValue({ store: "export" } as never);
    previewStoreMock.mockReturnValue({
      getSortRunForPreview: vi.fn()
    } as never);
    fullSortSnapshotMock.mockResolvedValue(null);
    exportMock.mockResolvedValue({
      status: "exporting",
      sortRunId: "sort_1",
      state: "creating_playlists",
      selectedPlaylistCount: 1,
      selectedTrackCount: 2,
      jobId: "job_1"
    });
  });

  it("requires an authenticated user", async () => {
    authMock.mockResolvedValueOnce({
      status: "signed_out",
      user: null,
      supabase: null
    });

    const response = await exportPost(new Request("http://test.local"), {
      params: Promise.resolve({ sortId: "sort_1" })
    });

    await expect(response.json()).resolves.toEqual({ error: "Sign in required." });
    expect(response.status).toBe(401);
  });

  it("queues reviewed Apple Music export through the platform endpoint", async () => {
    const response = await exportPost(
      new Request("http://test.local", {
        method: "POST",
        body: JSON.stringify({
          selectedPlaylistIds: ["playlist_1"],
          removedTrackFingerprintsByPlaylistId: {
            playlist_1: ["fp_1"]
          },
          renamedPlaylistTitlesById: {
            playlist_1: "Late night edits"
          }
        })
      }),
      {
        params: Promise.resolve({ sortId: "sort_1" })
      }
    );

    await expect(response.json()).resolves.toMatchObject({
      status: "exporting",
      state: "creating_playlists"
    });
    expect(response.status).toBe(200);
    expect(exportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sortRunId: "sort_1",
        userId: "user_1",
        selection: {
          selectedPlaylistIds: ["playlist_1"],
          removedTrackFingerprintsByPlaylistId: {
            playlist_1: ["fp_1"]
          },
          renamedPlaylistTitlesById: {
            playlist_1: "Late night edits"
          }
        }
      })
    );
  });

  it("uses stored full-organization playlists as the export review snapshot for started Sorts", async () => {
    const storedSnapshot = {
      sortRunId: "sort_1",
      librarySyncId: "sync_1",
      generatedAt: "2026-05-27T12:00:00.000Z",
      playlists: []
    };
    const getSortRunForPreview = vi.fn().mockResolvedValue({
      id: "sort_1",
      userId: "user_1",
      librarySyncId: "sync_1",
      state: "paid",
      paymentStatus: "paid",
      previewSnapshot: null,
      requests: []
    });
    previewStoreMock.mockReturnValueOnce({
      getSortRunForPreview
    } as never);
    fullSortSnapshotMock.mockResolvedValueOnce(storedSnapshot);

    await exportPost(
      new Request("http://test.local", {
        method: "POST",
        body: JSON.stringify({
          selectedPlaylistIds: ["playlist_1"],
          removedTrackFingerprintsByPlaylistId: {},
          renamedPlaylistTitlesById: {}
        })
      }),
      {
        params: Promise.resolve({ sortId: "sort_1" })
      }
    );

    const getSortRunForExport = exportStoreMock.mock.calls[0]?.[1];

    expect(getSortRunForExport).toEqual(expect.any(Function));
    await expect(
      getSortRunForExport({ sortRunId: "sort_1", userId: "user_1" })
    ).resolves.toMatchObject({
      state: "paid",
      paymentStatus: "paid",
      previewSnapshot: storedSnapshot
    });
    expect(fullSortSnapshotMock).toHaveBeenCalledWith({
      supabase: {},
      sortRunId: "sort_1",
      librarySyncId: "sync_1"
    });
  });

  it("uses stored review snapshots when retrying failed Sort exports", async () => {
    const storedSnapshot = {
      sortRunId: "sort_1",
      librarySyncId: "sync_1",
      generatedAt: "2026-05-27T12:00:00.000Z",
      playlists: []
    };
    const getSortRunForPreview = vi.fn().mockResolvedValue({
      id: "sort_1",
      userId: "user_1",
      librarySyncId: "sync_1",
      state: "failed",
      paymentStatus: "paid",
      previewSnapshot: null,
      requests: []
    });
    previewStoreMock.mockReturnValueOnce({
      getSortRunForPreview
    } as never);
    fullSortSnapshotMock.mockResolvedValueOnce(storedSnapshot);

    await exportPost(
      new Request("http://test.local", {
        method: "POST",
        body: JSON.stringify({
          selectedPlaylistIds: ["playlist_1"],
          removedTrackFingerprintsByPlaylistId: {},
          renamedPlaylistTitlesById: {}
        })
      }),
      {
        params: Promise.resolve({ sortId: "sort_1" })
      }
    );

    const getSortRunForExport = exportStoreMock.mock.calls[0]?.[1];

    expect(getSortRunForExport).toEqual(expect.any(Function));
    await expect(
      getSortRunForExport({ sortRunId: "sort_1", userId: "user_1" })
    ).resolves.toMatchObject({
      state: "failed",
      paymentStatus: "paid",
      previewSnapshot: storedSnapshot
    });
  });
});

describe("POST /api/sort-runs/[id]/confirm", () => {
  it("does not queue write-back from the legacy confirmation endpoint", async () => {
    vi.clearAllMocks();

    const response = await legacyConfirmPost(
      new Request("http://test.local", {
        method: "POST",
        body: JSON.stringify({
          selectedPlaylistIds: ["playlist_1"],
          removedTrackFingerprintsByPlaylistId: {}
        })
      }),
      {
        params: Promise.resolve({ id: "sort_1" })
      }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Legacy Sort confirmation is disabled. Review the Sort in the platform workflow before exporting approved tracks.",
      nextPath: "/app/sorts/sort_1/review",
      nextApiPath: "/api/app/sorts/sort_1/export"
    });
    expect(response.status).toBe(409);
    expect(exportMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/sort-runs/[id]/checkout", () => {
  it("does not unlock full organization from the legacy checkout endpoint", async () => {
    vi.clearAllMocks();

    const response = await legacyCheckoutPost(
      new Request("http://test.local", { method: "POST" }),
      {
        params: Promise.resolve({ id: "sort_1" })
      }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Legacy checkout is disabled. Start full-library organization from the platform workflow.",
      nextPath: "/app/sorts/sort_1/start",
      nextApiPath: "/api/app/sorts/sort_1/start"
    });
    expect(response.status).toBe(409);
    expect(withPgBossMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/sort-runs/[id]/create-playlists", () => {
  it("does not queue write-back from the legacy create-playlists endpoint", async () => {
    vi.clearAllMocks();

    const response = await legacyCreatePlaylistsPost(
      new Request("http://test.local", { method: "POST" }),
      {
        params: Promise.resolve({ id: "sort_1" })
      }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Legacy playlist creation is disabled. Use the platform review export flow to create Apple Music playlists and add approved tracks.",
      nextPath: "/app/sorts/sort_1/review",
      nextApiPath: "/api/app/sorts/sort_1/export"
    });
    expect(response.status).toBe(409);
    expect(exportMock).not.toHaveBeenCalled();
    expect(withPgBossMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/sort-runs/[id]/retry", () => {
  it("does not requeue write-back from the legacy retry endpoint", async () => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      status: "authenticated",
      user: { id: "user_1" },
      supabase: null
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);

    const response = await legacyRetryPost(
      new Request("http://test.local", { method: "POST" }),
      {
        params: Promise.resolve({ id: "sort_1" })
      }
    );

    await expect(response.json()).resolves.toEqual({
      error: "Legacy Sort write-back retry is disabled. Reopen the Sort in the platform review flow before exporting approved tracks.",
      nextPath: "/app/sorts/sort_1/review",
      nextApiPath: "/api/app/sorts/sort_1/export"
    });
    expect(response.status).toBe(409);
    expect(exportMock).not.toHaveBeenCalled();
    expect(withPgBossMock).not.toHaveBeenCalled();
  });
});
