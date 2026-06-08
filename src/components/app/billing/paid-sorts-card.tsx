import React from "react";
import Link from "next/link";
import type { Route } from "next";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import type { PaidSortSummary } from "@/modules/payments/list-payments";

export function PaidSortsCard({ paidSorts }: { paidSorts: PaidSortSummary[] }) {
  return (
    <Card className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
          Historical paid Sorts
        </h2>
        <p className="mt-2 text-sm leading-6 text-platform-secondary">
          Previous one-time Sort purchases remain visible for existing records.
        </p>
      </div>

      {paidSorts.length === 0 ? (
        <EmptyState
          title="No paid Sorts yet."
          description="Historical paid Sorts will appear here if paid records exist."
        />
      ) : (
        <div className="grid gap-3">
          {paidSorts.map((sort) => (
            <Link
              key={sort.id}
              href={`/app/sorts/${encodeURIComponent(sort.id)}` as Route}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{sort.title}</h3>
                  <p className="mt-1 text-xs text-platform-secondary">
                    {sort.amountCents === null ? "Amount unavailable" : formatMoney(sort.amountCents)}
                    {sort.paidAt ? ` · Paid ${formatDate(sort.paidAt)}` : ""}
                  </p>
                </div>
                <StatusPill label={formatStatus(sort.status)} tone="success" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");
}

function formatMoney(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amountCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
