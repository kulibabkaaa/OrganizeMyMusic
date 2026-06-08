import { describe, expect, it } from "vitest";

import {
  createSupabasePaymentStore,
  getCheckoutMode,
  getSortStartReadiness,
  summarizeCheckout
} from "@/modules/payments/checkout";

describe("payments checkout", () => {
  it("uses deferred billing by default while subscription packaging is paused", () => {
    expect(getCheckoutMode({})).toBe("deferred");
    expect(getCheckoutMode({ PAYMENTS_ENABLED: "false" })).toBe("deferred");
    expect(getCheckoutMode({ PAYMENTS_DEV_BYPASS_ENABLED: "false" })).toBe("deferred");
  });

  it("enables only the explicit dev bypass when approved", () => {
    expect(getCheckoutMode({ PAYMENTS_DEV_BYPASS_ENABLED: "true" })).toBe("dev_bypass");
    expect(getCheckoutMode({ PAYMENTS_DEV_BYPASS_ENABLED: "1" })).toBe("dev_bypass");
  });

  it("uses Stripe mode only when payments are enabled", () => {
    expect(getCheckoutMode({ PAYMENTS_ENABLED: "true" })).toBe("stripe");
    expect(getCheckoutMode({ PAYMENTS_ENABLED: "1", PAYMENTS_DEV_BYPASS_ENABLED: "true" })).toBe("stripe");
  });

  it("summarizes the Sort-specific generation start surface", () => {
    expect(
      summarizeCheckout({
        sortName: "My Apple Music cleanup",
        recipeCount: 3,
        estimatedTrackCount: 90,
        mode: "deferred"
      })
    ).toEqual({
      title: "Start full library organization",
      description:
        "Generate proposed playlists from your Apple Music library, review every track, then export only approved tracks.",
      sortName: "My Apple Music cleanup",
      recipeCount: 3,
      connectedLibrary: "Apple Music",
      estimatedOutput: "About 90 tracks across 3 Playlist Recipes",
      priceLabel: "Included during MVP",
      included: [
        "Full-library analysis",
        "Playlist recipes converted into proposed tracks",
        "Track-level review before export",
        "Create Apple Music playlists and add approved tracks"
      ],
      ctaLabel: "Generate full results"
    });
  });

  it("requires preview-ready state, library sync, and recipes before start", () => {
    const startableSort = {
      id: "sort_1",
      name: "My Apple Music cleanup",
      state: "preview_ready",
      paymentStatus: "pending",
      librarySyncId: "sync_1",
      recipeCount: 3,
      estimatedTrackCount: 90
    };

    expect(getSortStartReadiness(startableSort)).toEqual({ status: "ready" });
    expect(getSortStartReadiness({ ...startableSort, state: "draft" })).toEqual({
      status: "not_ready",
      message: "Generate a reviewable preview before starting full organization."
    });
    expect(getSortStartReadiness({ ...startableSort, librarySyncId: null })).toEqual({
      status: "not_ready",
      message: "Complete an Apple Music library sync before starting full organization."
    });
    expect(getSortStartReadiness({ ...startableSort, recipeCount: 0 })).toEqual({
      status: "not_ready",
      message: "Add at least one Playlist Recipe before starting full organization."
    });
  });

  it("stores one deferred unlock marker when a preview-ready Sort starts", async () => {
    const supabase = createPaymentSupabaseMock({
      updateResult: { data: { id: "sort_1" }, error: null },
      existingPaymentResult: { data: [], error: null },
      insertResult: { error: null }
    });

    const result = await createSupabasePaymentStore(supabase).markSortUnlockedForDeferredBilling({
      sortRunId: "sort_1",
      userId: "user_1"
    });

    expect(result).toBe(true);
    expect(supabase.inserts).toHaveLength(1);
    expect(supabase.inserts[0]).toMatchObject({
      sort_run_id: "sort_1",
      stripe_checkout_session_id: "billing_deferred",
      status: "paid",
      amount_cents: 0
    });
  });

  it("reuses an existing deferred unlock marker when start is retried after paid state", async () => {
    const supabase = createPaymentSupabaseMock({
      updateResult: { data: null, error: null },
      existingSortResult: {
        data: {
          id: "sort_1",
          state: "paid",
          payment_status: "paid"
        },
        error: null
      },
      existingPaymentResult: { data: [{ id: "payment_1" }], error: null },
      insertResult: { error: null }
    });

    const result = await createSupabasePaymentStore(supabase).markSortUnlockedForDeferredBilling({
      sortRunId: "sort_1",
      userId: "user_1"
    });

    expect(result).toBe(true);
    expect(supabase.inserts).toHaveLength(0);
  });
});

function createPaymentSupabaseMock(input: {
  updateResult: { data: unknown; error: { message: string } | null };
  existingSortResult?: { data: unknown; error: { message: string } | null };
  existingPaymentResult: { data: unknown[]; error: { message: string } | null };
  insertResult: { error: { message: string; code?: string } | null };
}) {
  const inserts: unknown[] = [];
  const supabase = {
    inserts,
    from(table: string) {
      if (table === "sort_runs") {
        return createSortRunsQuery(input);
      }

      if (table === "payments") {
        return createPaymentsQuery(input, inserts);
      }

      throw new Error(`Unexpected table: ${table}`);
    }
  };

  return supabase as typeof supabase & Parameters<typeof createSupabasePaymentStore>[0];
}

function createSortRunsQuery(input: {
  updateResult: { data: unknown; error: { message: string } | null };
  existingSortResult?: { data: unknown; error: { message: string } | null };
}) {
  return {
    update() {
      return createChain({
        in: () => ({
          select: () => ({
            maybeSingle: async () => input.updateResult
          })
        })
      });
    },
    select() {
      return createChain({
        maybeSingle: async () =>
          input.existingSortResult ?? {
            data: null,
            error: null
          }
      });
    }
  };
}

function createPaymentsQuery(
  input: {
    existingPaymentResult: { data: unknown[]; error: { message: string } | null };
    insertResult: { error: { message: string; code?: string } | null };
  },
  inserts: unknown[]
) {
  return {
    select() {
      return createChain({
        limit: async () => input.existingPaymentResult
      });
    },
    async insert(row: unknown) {
      inserts.push(row);
      return input.insertResult;
    }
  };
}

function createChain<T extends Record<string, unknown>>(terminal: T) {
  return {
    eq() {
      return this;
    },
    ...terminal
  };
}
