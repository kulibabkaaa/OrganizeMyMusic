import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BillingPage } from "@/components/app/billing/billing-page";
import type { BillingSummary } from "@/modules/payments/list-payments";

const emptySummary: BillingSummary = {
  currentPlan: {
    name: "Pay per Sort",
    description: "No active subscription.",
    details:
      "Each paid Sort unlocks full analysis, editable results, and Apple Music export for that Sort."
  },
  paidSorts: [],
  paymentHistory: []
};

const paidSummary: BillingSummary = {
  ...emptySummary,
  paidSorts: [
    {
      id: "sort_1",
      title: "My Apple Music cleanup",
      status: "completed",
      paidAt: "2026-05-26T12:06:00.000Z",
      amountCents: 900
    }
  ],
  paymentHistory: [
    {
      id: "payment_1",
      sortId: "sort_1",
      sortTitle: "My Apple Music cleanup",
      status: "paid",
      amountCents: 900,
      createdAt: "2026-05-26T12:05:00.000Z",
      receiptUrl: "https://billing.stripe.com/receipt/payment_1"
    }
  ]
};

describe("billing page", () => {
  it("renders the pay-per-Sort plan and empty billing state", () => {
    const markup = renderToStaticMarkup(<BillingPage summary={emptySummary} />);

    expect(markup).toContain("Billing");
    expect(markup).toContain("Pay per Sort");
    expect(markup).toContain("No active subscription.");
    expect(markup).toContain("Each paid Sort unlocks full analysis, editable results, and Apple Music export for that Sort.");
    expect(markup).toContain("No paid Sorts yet.");
    expect(markup).toContain("No payment history yet.");
    expect(markup).toContain("Manage billing settings");
    expect(markup).not.toContain("monthly");
    expect(markup).not.toContain("subscription plan");
  });

  it("renders paid Sorts, payment history, and receipt links", () => {
    const markup = renderToStaticMarkup(<BillingPage summary={paidSummary} />);

    expect(markup).toContain("My Apple Music cleanup");
    expect(markup).toContain("$9.00");
    expect(markup).toContain("Completed");
    expect(markup).toContain("Paid");
    expect(markup).toContain("May 26, 2026");
    expect(markup).toContain("Receipt");
    expect(markup).toContain("https://billing.stripe.com/receipt/payment_1");
  });
});
