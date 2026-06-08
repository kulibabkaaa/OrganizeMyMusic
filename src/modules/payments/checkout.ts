import type { SupabaseClient } from "@supabase/supabase-js";

import { env, requireServerEnv } from "@/lib/env";
import { getStripe } from "@/modules/billing/stripe";

export type CheckoutMode = "disabled" | "dev_bypass" | "stripe";

export interface CheckoutSortSummary {
  id: string;
  name: string;
  paymentStatus: string;
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
}

export function getCheckoutMode(config: Record<string, string | undefined> = env): CheckoutMode {
  if (isEnabled(config.PAYMENTS_ENABLED)) {
    return "stripe";
  }

  if (isEnabled(config.PAYMENTS_DEV_BYPASS_ENABLED)) {
    return "dev_bypass";
  }

  return "disabled";
}

export function summarizeCheckout(input: {
  sortName: string;
  recipeCount: number;
  estimatedTrackCount: number | null;
  mode: CheckoutMode;
}): CheckoutSummary {
  const estimatedTrackCount = input.estimatedTrackCount ?? input.recipeCount * 30;

  return {
    title: "Unlock this Sort",
    description:
      "Generate full playlists from your Apple Music library, review the results, and export them to Apple Music.",
    sortName: input.sortName,
    recipeCount: input.recipeCount,
    connectedLibrary: "Apple Music",
    estimatedOutput: `About ${estimatedTrackCount} tracks across ${input.recipeCount} Playlist Recipes`,
    priceLabel: input.mode === "dev_bypass" ? "Dev bypass enabled" : "$19.00",
    included: [
      "Full library analysis",
      "Generated playlists from your recipes",
      "Track-level review before export",
      "Create playlists in Apple Music"
    ],
    ctaLabel: input.mode === "dev_bypass" ? "Use approved dev bypass" : "Pay and start full Sort"
  };
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
        .select("id,name,payment_status,preview_snapshot")
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
        paymentStatus: data.payment_status as string,
        recipeCount: count ?? 0,
        estimatedTrackCount: estimateTracksFromPreview(data.preview_snapshot)
      };
    },

    async markSortPaidByDevBypass(input) {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("sort_runs")
        .update({
          payment_status: "paid",
          state: "paid",
          updated_at: now
        })
        .eq("id", input.sortRunId)
        .eq("user_id", input.userId)
        .select("id")
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return false;
      }

      const { error: paymentError } = await supabase.from("payments").insert({
        sort_run_id: input.sortRunId,
        stripe_checkout_session_id: "dev_bypass",
        stripe_payment_intent_id: null,
        status: "paid",
        amount_cents: 0,
        updated_at: now
      });

      if (paymentError) {
        throw new Error(paymentError.message);
      }

      return true;
    }
  };
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
