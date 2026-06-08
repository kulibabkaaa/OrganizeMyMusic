import React from "react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { ActiveSortCounts } from "@/modules/sorts/list-sort-runs";

export function ActiveSortsCard({ counts }: { counts: ActiveSortCounts }) {
  return (
    <Card as="article" className="min-h-48">
      <StatusPill label="Sorts" tone="pink" />
      <h3 className="mt-4 font-display text-2xl font-semibold tracking-[0em] text-white">
        Active Sorts
      </h3>
      <div className="mt-4 grid gap-3">
        <CountRow label="Draft" value={counts.draft} />
        <CountRow label="Processing" value={counts.processing} />
        <CountRow label="Ready for review" value={counts.readyForReview} />
      </div>
    </Card>
  );
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm text-platform-secondary">
      <span>{label}</span>
      <strong className="font-mono text-lg text-white">{value}</strong>
    </div>
  );
}
