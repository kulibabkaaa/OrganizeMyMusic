import type { SupabaseClient } from "@supabase/supabase-js";

import { env, requireServerEnv } from "@/lib/env";
import { getStripe } from "@/modules/billing/stripe";

export type CheckoutMode = "deferred" | "disabled" | "dev_bypass" | "stripe";

export interface CheckoutSortSummary {
  id: string;
  name: string;
  state: string;
  paymentStatus: string;
  librarySyncId: string | null;
  recipeCount: number;
  estimatedTrackCount: number | null;
}

export interface CheckoutSummary {
  title: string;
  description: string;
  sortName: string;
  recipeCount: number;
  connectedLibrary: "Apple Music";
  estimatedOutput: string;
  priceLabel: string;
  included: string[];
  ctaLabel: string;
}

export interface PaymentStore {
  getSortForCheckout(input: {
    sortRunId: string;
    userId: string;
  }): Promise<CheckoutSortSummary | null>;
  markSortPaidByDevBypass(input: {
    sortRunId: string;
    userId: string;
  }): Promise<boolean>;
  markSortUnlockedForDeferredBilling(input: {
    sortRunId: string;
    userId: string;
  }): Promise<boolean>;
}

export type SortStartReadiness =
  | {
      status: "ready";
    }
  | {
      status: "not_ready";
      message: string;
    };

export function getCheckoutMode(config: Record<string, string | undefined> = env): CheckoutMode {
  if (isEnabled(config.PAYMENTS_ENABLED)) {
    return "stripe";
  }

  if (isEnabled(config.PAYMENTS_DEV_BYPASS_ENABLED)) {
    return "dev_bypass";
  }

  return "deferred";
}

export function summarizeCheckout(input: {
  sortName: string;
  recipeCount: number;
  estimatedTrackCount: number | null;
  mode: CheckoutMode;
}): CheckoutSummary {
  const estimatedTrackCount = input.estimatedTrackCount ?? input.recipeCount * 30;

  return {
    title: input.mode === "deferred" ? "Start full library organization" : "Start this Sort",
    description:
      "Generate proposed playlists from your Apple Music library, review every track, then export only approved tracks.",
    sortName: input.sortName,
    recipeCount: input.recipeCount,
    connectedLibrary: "Apple Music",
    estimatedOutput: `About ${estimatedTrackCount} tracks across ${input.recipeCount} Playlist Recipes`,
    priceLabel:
      input.mode === "deferred"
        ? "Included during MVP"
        : input.mode === "dev_bypass"
          ? "Dev bypass enabled"
          : "$19.00",
    included: [
      "Full-library analysis",
      "Playlist recipes converted into proposed tracks",
      "Track-level review before export",
      "Create Apple Music playlists and add approved tracks"
    ],
    ctaLabel:
      input.mode === "deferred"
        ? "Generate full results"
        : input.mode === "dev_bypass"
          ? "Use approved dev bypass"
          : "Continue to billing"
  };
}

export function getSortStartReadiness(sort: CheckoutSortSummary): SortStartReadiness {
  if (sort.state !== "preview_ready" && sort.state !== "paid") {
    return {
      status: "not_ready",
      message: "Generate a reviewable preview before starting full organization."
    };
  }

  if (!sort.librarySyncId) {
    return {
      status: "not_ready",
      message: "Complete an Apple Music library sync before starting full organization."
    };
  }

  if (sort.recipeCount === 0) {
    return {
      status: "not_ready",
      message: "Add at least one Playlist Recipe before starting full organization."
    };
  }

  return { status: "ready" };
}

export async function unlockSortWithDevBypass(input: {
  store: PaymentStore;
  sortRunId: string;
  userId: string;
}) {
  const paid = await input.store.markSortPaidByDevBypass({
    sortRunId: input.sortRunId,
    userId: input.userId
  });

  if (!paid) {
    return {
      status: "not_found" as const,
      message: "Sort not found."
    };
  }

  return {
    status: "paid" as const,
    processingUrl: `/app/sorts/${encodeURIComponent(input.sortRunId)}/processing`
  };
}

export async function unlockSortWithDeferredBilling(input: {
  store: PaymentStore;
  sortRunId: string;
  userId: string;
}) {
  const paid = await input.store.markSortUnlockedForDeferredBilling({
    sortRunId: input.sortRunId,
    userId: input.userId
  });

  if (!paid) {
    return {
      status: "not_found" as const,
      message: "Sort not found."
    };
  }

  return {
    status: "paid" as const,
    processingUrl: `/app/sorts/${encodeURIComponent(input.sortRunId)}/processing`
  };
}

export async function createStripeCheckoutForSort(input: {
  sortRunId: string;
}) {
  const stripe = getStripe();

  if (!stripe) {
    return null;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${env.NEXT_PUBLIC_APP_URL}/app/sorts/${encodeURIComponent(input.sortRunId)}/processing`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/app/sorts/${encodeURIComponent(input.sortRunId)}/preview`,
    line_items: [
      {
        price: requireServerEnv("STRIPE_PRICE_SORT"),
        quantity: 1
      }
    ],
    metadata: {
      sortRunId: input.sortRunId
    }
  });

  return {
    checkoutUrl: session.url
  };
}

export function createSupabasePaymentStore(supabase: SupabaseClient): PaymentStore {
  return {
    async getSortForCheckout(input) {
      const { data, error } = await supabase
        .from("sort_runs")
        .select("id,name,state,payment_status,library_sync_id,preview_snapshot")
        .eq("id", input.sortRunId)
        .eq("user_id", input.userId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      const { count, error: countError } = await supabase
        .from("playlist_recipes")
        .select("id", { count: "exact", head: true })
        .eq("sort_run_id", input.sortRunId)
        .eq("user_id", input.userId);

      if (countError) {
        throw new Error(countError.message);
      }

      return {
        id: data.id as string,
        name: (data.name as string | null) ?? "Untitled Sort",
        state: data.state as string,
        paymentStatus: data.payment_status as string,
        librarySyncId: (data.library_sync_id as string | null) ?? null,
        recipeCount: count ?? 0,
        estimatedTrackCount: estimateTracksFromPreview(data.preview_snapshot)
      };
    },

    async markSortPaidByDevBypass(input) {
      return markSortPaidWithZeroDollarPayment({
        supabase,
        sortRunId: input.sortRunId,
        userId: input.userId,
        paymentMarker: "dev_bypass"
      });
    },

    async markSortUnlockedForDeferredBilling(input) {
      return markSortPaidWithZeroDollarPayment({
        supabase,
        sortRunId: input.sortRunId,
        userId: input.userId,
        paymentMarker: "billing_deferred"
      });
    }
  };
}

async function markSortPaidWithZeroDollarPayment(input: {
  supabase: SupabaseClient;
  sortRunId: string;
  userId: string;
  paymentMarker: "billing_deferred" | "dev_bypass";
}) {
  const now = new Date().toISOString();
  const { data, error } = await input.supabase
    .from("sort_runs")
    .update({
      payment_status: "paid",
      state: "paid",
      updated_at: now
    })
    .eq("id", input.sortRunId)
    .eq("user_id", input.userId)
    .in("state", ["preview_ready", "paid"])
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const { data: existingSort, error: existingSortError } = await input.supabase
      .from("sort_runs")
      .select("id,state,payment_status")
      .eq("id", input.sortRunId)
      .eq("user_id", input.userId)
      .maybeSingle();

    if (existingSortError) {
      throw new Error(existingSortError.message);
    }

    if (!existingSort) {
      return false;
    }

    if (existingSort.state !== "paid" || existingSort.payment_status !== "paid") {
      return false;
    }
  }

  const existingPayment = await hasZeroDollarUnlockPayment(input);

  if (existingPayment) {
    return true;
  }

  const { error: paymentError } = await input.supabase.from("payments").insert({
    sort_run_id: input.sortRunId,
    stripe_checkout_session_id: input.paymentMarker,
    stripe_payment_intent_id: null,
    status: "paid",
    amount_cents: 0,
    updated_at: now
  });

  if (paymentError) {
    if (isDuplicatePaymentMarkerError(paymentError)) {
      return true;
    }

    throw new Error(paymentError.message);
  }

  return true;
}

async function hasZeroDollarUnlockPayment(input: {
  supabase: SupabaseClient;
  sortRunId: string;
  paymentMarker: "billing_deferred" | "dev_bypass";
}) {
  const { data, error } = await input.supabase
    .from("payments")
    .select("id")
    .eq("sort_run_id", input.sortRunId)
    .eq("stripe_checkout_session_id", input.paymentMarker)
    .eq("status", "paid")
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) && data.length > 0;
}

function isDuplicatePaymentMarkerError(error: { code?: string }) {
  return error.code === "23505";
}

function isEnabled(value: string | undefined) {
  return value === "true" || value === "1";
}

function estimateTracksFromPreview(value: unknown) {
  if (!value || typeof value !== "object" || !("playlists" in value)) {
    return null;
  }

  const playlists = (value as { playlists?: Array<{ estimatedTrackCount?: number; trackCount?: number }> }).playlists;

  if (!Array.isArray(playlists)) {
    return null;
  }

  return playlists.reduce(
    (total, playlist) => total + Number(playlist.estimatedTrackCount ?? playlist.trackCount ?? 0),
    0
  );
}
