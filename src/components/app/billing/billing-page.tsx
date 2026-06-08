import React from "react";

import { CurrentPlanCard } from "@/components/app/billing/current-plan-card";
import { PaidSortsCard } from "@/components/app/billing/paid-sorts-card";
import { PaymentHistoryTable } from "@/components/app/billing/payment-history-table";
import type { BillingSummary } from "@/modules/payments/list-payments";

export function BillingPage({ summary }: { summary: BillingSummary }) {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
          Account
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white md:text-4xl">
          Billing
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
          Billing is paused while the Apple Music platform workflow is verified. No subscription
          or paid plan is active.
        </p>
      </section>

      <section className="grid gap-5 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <CurrentPlanCard plan={summary.currentPlan} />
        <div className="grid gap-5">
          <PaidSortsCard paidSorts={summary.paidSorts} />
          <PaymentHistoryTable payments={summary.paymentHistory} />
        </div>
      </section>
    </div>
  );
}
