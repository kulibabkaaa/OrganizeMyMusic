import React from "react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusPill } from "@/components/ui/status-pill";
import type { PaymentHistoryItem } from "@/modules/payments/list-payments";

export function PaymentHistoryTable({
  payments
}: {
  payments: PaymentHistoryItem[];
}) {
  return (
    <Card className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold tracking-[0em] text-white">
          Payment history
        </h2>
        <p className="mt-2 text-sm leading-6 text-platform-secondary">
          Existing receipts remain visible. New billing is deferred for the MVP.
        </p>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          title="No payment history yet."
          description="Payment rows will appear after Stripe checkout is enabled and completed."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <caption className="sr-only">Payment history for paid Sorts</caption>
            <thead className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-platform-muted">
              <tr>
                <th scope="col" className="px-3 py-3 font-medium">Sort</th>
                <th scope="col" className="px-3 py-3 font-medium">Date</th>
                <th scope="col" className="px-3 py-3 font-medium">Amount</th>
                <th scope="col" className="px-3 py-3 font-medium">Status</th>
                <th scope="col" className="px-3 py-3 font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {payments.map((payment) => (
                <tr key={payment.id} className="text-platform-secondary">
                  <td className="px-3 py-4 font-semibold text-white">{payment.sortTitle}</td>
                  <td className="px-3 py-4">{formatDate(payment.createdAt)}</td>
                  <td className="px-3 py-4">{formatMoney(payment.amountCents)}</td>
                  <td className="px-3 py-4">
                    <StatusPill label={formatStatus(payment.status)} tone={payment.status === "paid" ? "success" : "muted"} />
                  </td>
                  <td className="px-3 py-4">
                    {payment.receiptUrl ? (
                      <a
                        href={payment.receiptUrl}
                        className="font-semibold text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white"
                      >
                        Receipt
                      </a>
                    ) : (
                      <span>Unavailable</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
