import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/app/sorts/[sortId]/checkout/route";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { withPgBoss } from "@/lib/pg-boss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabasePaymentStore,
  getCheckoutMode,
  unlockSortWithDeferredBilling,
  unlockSortWithDevBypass
} from "@/modules/payments/checkout";
import {
  createSupabaseFullSortStore,
  queueFullSortAfterPayment
} from "@/modules/sorts/full-sort-job";

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedSession: vi.fn()
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseServiceRoleClient: vi.fn()
}));

vi.mock("@/lib/pg-boss", () => ({
  withPgBoss: vi.fn()
}));

vi.mock("@/modules/payments/checkout", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/payments/checkout")>();

  return {
    ...actual,
    createSupabasePaymentStore: vi.fn(),
    getCheckoutMode: vi.fn(),
    unlockSortWithDeferredBilling: vi.fn(),
    unlockSortWithDevBypass: vi.fn()
  };
});

vi.mock("@/modules/sorts/full-sort-job", () => ({
  createSupabaseFullSortStore: vi.fn(),
  queueFullSortAfterPayment: vi.fn()
}));

const authMock = vi.mocked(getAuthenticatedSession);
const withPgBossMock = vi.mocked(withPgBoss);
const serviceRoleMock = vi.mocked(createSupabaseServiceRoleClient);
const storeMock = vi.mocked(createSupabasePaymentStore);
const modeMock = vi.mocked(getCheckoutMode);
const deferredUnlockMock = vi.mocked(unlockSortWithDeferredBilling);
const bypassMock = vi.mocked(unlockSortWithDevBypass);
const fullSortStoreMock = vi.mocked(createSupabaseFullSortStore);
const queueFullSortMock = vi.mocked(queueFullSortAfterPayment);

describe("POST /api/app/sorts/[sortId]/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({
      status: "authenticated",
      user: { id: "user_1" },
      supabase: null
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedSession>>);
    serviceRoleMock.mockReturnValue({} as ReturnType<typeof createSupabaseServiceRoleClient>);
    storeMock.mockReturnValue({ store: "payment" } as unknown as ReturnType<typeof createSupabasePaymentStore>);
    fullSortStoreMock.mockReturnValue({ store: "full-sort" } as unknown as ReturnType<typeof createSupabaseFullSortStore>);
    withPgBossMock.mockImplementation(async (callback) => callback({ queue: true } as never));
    modeMock.mockReturnValue("deferred");
    deferredUnlockMock.mockResolvedValue({
      status: "paid",
      processingUrl: "/app/sorts/sort_1/processing"
    });
    bypassMock.mockResolvedValue({
      status: "paid",
      processingUrl: "/app/sorts/sort_1/processing"
    });
    queueFullSortMock.mockResolvedValue({
      status: "queued",
      sortRunId: "sort_1",
      jobId: "job_1"
    });
  });

  it("requires an authenticated user", async () => {
    authMock.mockResolvedValueOnce({
      status: "signed_out",
      user: null,
      supabase: null
    });

    const response = await POST(new Request("http://test.local"), {
      params: Promise.resolve({ sortId: "sort_1" })
    });

    await expect(response.json()).resolves.toEqual({ error: "Sign in required." });
    expect(response.status).toBe(401);
  });

  it("keeps checkout blocked when the mode is explicitly disabled", async () => {
    modeMock.mockReturnValueOnce("disabled");

    const response = await POST(new Request("http://test.local"), {
      params: Promise.resolve({ sortId: "sort_1" })
    });

    await expect(response.json()).resolves.toEqual({
      error: "Full organization start is not enabled for this Sort."
    });
    expect(response.status).toBe(409);
    expect(deferredUnlockMock).not.toHaveBeenCalled();
    expect(bypassMock).not.toHaveBeenCalled();
  });

  it("unlocks the Sort through deferred billing and queues full organization by default", async () => {
    const response = await POST(new Request("http://test.local"), {
      params: Promise.resolve({ sortId: "sort_1" })
    });

    await expect(response.json()).resolves.toEqual({
      status: "paid",
      mode: "deferred",
      processingUrl: "/app/sorts/sort_1/processing",
      fullSort: {
        status: "queued",
        jobId: "job_1"
      }
    });
    expect(response.status).toBe(200);
    expect(deferredUnlockMock).toHaveBeenCalledWith({
      store: { store: "payment" },
      sortRunId: "sort_1",
      userId: "user_1"
    });
    expect(bypassMock).not.toHaveBeenCalled();
    expect(queueFullSortMock).toHaveBeenCalledWith({
      store: { store: "full-sort" },
      queue: { queue: true },
      sortRunId: "sort_1",
      userId: "user_1"
    });
  });

  it("keeps the explicit dev bypass path available when configured", async () => {
    modeMock.mockReturnValueOnce("dev_bypass");

    const response = await POST(new Request("http://test.local"), {
      params: Promise.resolve({ sortId: "sort_1" })
    });

    await expect(response.json()).resolves.toEqual({
      status: "paid",
      mode: "dev_bypass",
      processingUrl: "/app/sorts/sort_1/processing",
      fullSort: {
        status: "queued",
        jobId: "job_1"
      }
    });
    expect(response.status).toBe(200);
    expect(deferredUnlockMock).not.toHaveBeenCalled();
    expect(bypassMock).toHaveBeenCalledWith({
      store: { store: "payment" },
      sortRunId: "sort_1",
      userId: "user_1"
    });
    expect(queueFullSortMock).toHaveBeenCalledWith({
      store: { store: "full-sort" },
      queue: { queue: true },
      sortRunId: "sort_1",
      userId: "user_1"
    });
  });
});
