import React from "react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { CurrentPlanSummary } from "@/modules/payments/list-payments";

export function CurrentPlanCard({ plan }: { plan: CurrentPlanSummary }) {
  return (
    <Card elevated className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            Current plan
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white">
            {plan.name}
          </h2>
        </div>
        <StatusPill label="One-time" tone="pink" />
      </div>
      <p className="text-sm font-semibold text-white">{plan.description}</p>
      <p className="text-sm leading-7 text-platform-secondary">{plan.details}</p>
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-sm font-semibold text-white">Manage billing settings</p>
        <p className="mt-2 text-sm leading-6 text-platform-secondary">
          Stripe customer portal settings will appear here when billing management is configured.
        </p>
      </div>
    </Card>
  );
}
