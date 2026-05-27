import type { SupabaseClient } from "@supabase/supabase-js";

import type { PaymentStatus, SortRunState } from "@/types/domain";

export interface CurrentPlanSummary {
  name: "Pay per Sort";
  description: "No active subscription.";
  details: string;
}

export interface PaidSortSummary {
  id: string;
  title: string;
  status: SortRunState;
  paidAt: string | null;
  amountCents: number | null;
}

export interface PaymentHistoryItem {
  id: string;
  sortId: string;
  sortTitle: string;
  status: PaymentStatus;
  amountCents: number;
  createdAt: string;
  receiptUrl: string | null;
}

export interface BillingSummary {
  currentPlan: CurrentPlanSummary;
  paidSorts: PaidSortSummary[];
  paymentHistory: PaymentHistoryItem[];
}

export type BillingSortRunRow = {
  id: string;
  name: string | null;
  payment_status: PaymentStatus;
  state: SortRunState;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  sort_run_id: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  status: PaymentStatus;
  amount_cents: number;
  created_at: string;
  updated_at: string;
};

export interface BillingStore {
  listBillingSortRuns(userId: string): Promise<BillingSortRunRow[]>;
  listPayments(userId: string): Promise<PaymentRow[]>;
}

export function summarizeBillingData(input: {
  sortRuns: BillingSortRunRow[];
  payments: PaymentRow[];
}): BillingSummary {
  const sortRunsById = new Map(input.sortRuns.map((sortRun) => [sortRun.id, sortRun]));
  const paidPaymentBySortId = new Map(
    input.payments
      .filter((payment) => payment.status === "paid")
      .map((payment) => [payment.sort_run_id, payment])
  );

  return {
    currentPlan: {
      name: "Pay per Sort",
      description: "No active subscription.",
      details:
        "Each paid Sort unlocks full analysis, editable results, and Apple Music export for that Sort."
    },
    paidSorts: input.sortRuns
      .filter((sortRun) => sortRun.payment_status === "paid")
      .map((sortRun) => {
        const payment = paidPaymentBySortId.get(sortRun.id);

        return {
          id: sortRun.id,
          title: getSortTitle(sortRun),
          status: sortRun.state,
          paidAt: payment?.updated_at ?? null,
          amountCents: payment?.amount_cents ?? null
        };
      }),
    paymentHistory: input.payments.map((payment) => {
      const sortRun = sortRunsById.get(payment.sort_run_id);

      return {
        id: payment.id,
        sortId: payment.sort_run_id,
        sortTitle: sortRun ? getSortTitle(sortRun) : "Deleted Sort",
        status: payment.status,
        amountCents: payment.amount_cents,
        createdAt: payment.created_at,
        receiptUrl: null
      };
    })
  };
}

export async function listBillingSummary(input: {
  store: BillingStore;
  userId: string;
}): Promise<BillingSummary> {
  const [sortRuns, payments] = await Promise.all([
    input.store.listBillingSortRuns(input.userId),
    input.store.listPayments(input.userId)
  ]);

  return summarizeBillingData({ sortRuns, payments });
}

export function createSupabaseBillingStore(supabase: SupabaseClient): BillingStore {
  return {
    async listBillingSortRuns(userId) {
      const { data, error } = await supabase
        .from("sort_runs")
        .select("id,name,payment_status,state,updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to load billing Sorts.");
      }

      return data as BillingSortRunRow[];
    },

    async listPayments(userId) {
      const { data: sortRuns, error: sortRunError } = await supabase
        .from("sort_runs")
        .select("id")
        .eq("user_id", userId);

      if (sortRunError || !sortRuns) {
        throw new Error(sortRunError?.message ?? "Unable to load payment Sorts.");
      }

      const sortRunIds = sortRuns.map((sortRun) => sortRun.id as string);

      if (sortRunIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("payments")
        .select(
          "id,sort_run_id,stripe_checkout_session_id,stripe_payment_intent_id,status,amount_cents,created_at,updated_at"
        )
        .in("sort_run_id", sortRunIds)
        .order("created_at", { ascending: false });

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to load payments.");
      }

      return data as PaymentRow[];
    }
  };
}

function getSortTitle(sortRun: BillingSortRunRow) {
  return sortRun.name ?? "Untitled Sort";
}
