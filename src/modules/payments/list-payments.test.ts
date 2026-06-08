import { describe, expect, it } from "vitest";

import { summarizeBillingData } from "@/modules/payments/list-payments";

describe("billing summary", () => {
  it("lists historical paid Sorts and payment history with deferred billing copy", () => {
    const summary = summarizeBillingData({
      sortRuns: [
        {
          id: "sort_paid",
          name: "My Apple Music cleanup",
          payment_status: "paid",
          state: "completed",
          updated_at: "2026-05-26T12:00:00.000Z"
        },
        {
          id: "sort_draft",
          name: "Road trip cleanup",
          payment_status: "pending",
          state: "draft",
          updated_at: "2026-05-26T11:00:00.000Z"
        }
      ],
      payments: [
        {
          id: "payment_1",
          sort_run_id: "sort_paid",
          stripe_checkout_session_id: "cs_123",
          stripe_payment_intent_id: "pi_123",
          status: "paid",
          amount_cents: 900,
          created_at: "2026-05-26T12:05:00.000Z",
          updated_at: "2026-05-26T12:06:00.000Z"
        }
      ]
    });

    expect(summary.currentPlan).toEqual({
      name: "Billing deferred",
      description: "No active subscription or paid plan.",
      details:
        "The MVP is focused on Apple Music quality, playlist recipes, review, and app-created playlist export before subscription packaging is introduced."
    });
    expect(summary.paidSorts).toEqual([
      {
        id: "sort_paid",
        title: "My Apple Music cleanup",
        status: "completed",
        paidAt: "2026-05-26T12:06:00.000Z",
        amountCents: 900
      }
    ]);
    expect(summary.paymentHistory).toEqual([
      {
        id: "payment_1",
        sortId: "sort_paid",
        sortTitle: "My Apple Music cleanup",
        status: "paid",
        amountCents: 900,
        createdAt: "2026-05-26T12:05:00.000Z",
        receiptUrl: null
      }
    ]);
  });
});
