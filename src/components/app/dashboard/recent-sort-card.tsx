import React from "react";
import Link from "next/link";
import type { Route } from "next";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { RecentSortRunSummary } from "@/modules/sorts/list-sort-runs";

export function RecentSortCard({ sort }: { sort: RecentSortRunSummary }) {
  return (
    <Link href={sort.primaryRoute as Route} className="block">
      <Card as="article" className="min-h-48 transition hover:border-white/20 hover:bg-white/[0.08]">
        <StatusPill label={formatStatus(sort.uiStatus)} tone={getTone(sort.uiStatus)} />
        <h3 className="mt-4 font-display text-2xl font-semibold tracking-[0em] text-white">
          {sort.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-platform-secondary">
          {sort.recipeCount} Playlist Recipes
        </p>
        <p className="mt-1 text-sm leading-6 text-platform-secondary">{sort.provider}</p>
        <p className="mt-5 text-sm font-semibold text-white">{sort.nextActionLabel}</p>
      </Card>
    </Link>
  );
}

function formatStatus(status: RecentSortRunSummary["uiStatus"]) {
  return status
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function getTone(status: RecentSortRunSummary["uiStatus"]) {
  if (status === "failed") {
    return "danger" as const;
  }

  if (["ready_for_review", "exported"].includes(status)) {
    return "success" as const;
  }

  if (["processing", "preview_generating", "exporting"].includes(status)) {
    return "pink" as const;
  }

  return "warning" as const;
}
