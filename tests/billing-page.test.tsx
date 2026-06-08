import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BillingPage } from "@/components/app/billing/billing-page";
import type { BillingSummary } from "@/modules/payments/list-payments";

const emptySummary: BillingSummary = {
  currentPlan: {
    name: "Billing deferred",
    description: "No active subscription or paid plan.",
    details:
      "The MVP is focused on Apple Music quality, playlist recipes, review, and app-created playlist export before subscription packaging is introduced."
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
  it("renders deferred billing and empty historical payment state", () => {
    const markup = renderToStaticMarkup(<BillingPage summary={emptySummary} />);

    expect(markup).toContain("Billing");
    expect(markup).toContain("Billing deferred");
    expect(markup).toContain("No active subscription or paid plan.");
    expect(markup).toContain("Billing is paused while the Apple Music platform workflow is verified.");
    expect(markup).toContain("playlist recipes, review, and app-created playlist export");
    expect(markup).toContain("No billing records yet.");
    expect(markup).toContain("No payment history yet.");
    expect(markup).toContain("Billing controls paused");
    expect(markup).not.toContain("monthly");
    expect(markup).not.toContain("subscription plan");
    expect(markup).not.toContain("Pay per Sort");
    expect(markup).not.toContain("checkout controls");
    expect(markup).not.toContain("Pay per Sort");
    expect(markup).toContain("Historical organization billing records will appear here");
  });

  it("renders historical organization billing records, payment history, and receipt links", () => {
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
