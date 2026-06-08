import React from "react";
import Link from "next/link";

import { SortCard } from "@/components/app/sorts/sort-card";
import { SortEmptyState } from "@/components/app/sorts/sort-empty-state";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  filterSortsForIndex,
  getSortIndexFilterCounts,
  type RecentSortRunSummary,
  type SortIndexFilter
} from "@/modules/sorts/list-sort-runs";

export type { SortIndexFilter };

const sortFilters: Array<{ value: SortIndexFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "processing", label: "Processing" },
  { value: "ready_for_review", label: "Ready for review" },
  { value: "exported", label: "Exported" },
  { value: "failed", label: "Failed" }
];

export function SortsIndex({
  sorts,
  selectedFilter
}: {
  sorts: RecentSortRunSummary[];
  selectedFilter: SortIndexFilter;
}) {
  const counts = getSortIndexFilterCounts(sorts);
  const visibleSorts = filterSortsForIndex(sorts, selectedFilter);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            Sorts
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white md:text-4xl">
            Browse every Sort
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            Resume drafts, monitor processing, review playlists, and return to completed Apple Music exports.
          </p>
        </div>
        <Link
          href="/app/sorts/new"
          className="inline-flex min-w-44 items-center justify-center rounded-full bg-accent-sweep px-5 py-3 text-sm font-semibold text-white shadow-pulse transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
        >
          Organize My Library
        </Link>
      </section>

      <Card className="p-3">
        <nav aria-label="Sort status filters" className="flex flex-wrap gap-2">
          {sortFilters.map((filter) => (
            <Link
              key={filter.value}
              href={filter.value === "all" ? "/app/sorts" : `/app/sorts?status=${filter.value}`}
              aria-current={selectedFilter === filter.value ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
                selectedFilter === filter.value
                  ? "border-[rgba(255,45,85,0.35)] bg-[rgba(255,45,85,0.18)] text-white"
                  : "border-white/10 bg-white/[0.05] text-platform-secondary hover:bg-white/[0.09] hover:text-white"
              )}
            >
              <span>{filter.label}</span>
              <span className="font-mono text-xs text-white/70">{counts[filter.value]}</span>
            </Link>
          ))}
        </nav>
      </Card>

      {sorts.length === 0 ? (
        <SortEmptyState filter={selectedFilter} />
      ) : visibleSorts.length === 0 ? (
        <SortEmptyState filter={selectedFilter} />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Sort list">
          {visibleSorts.map((sort) => (
            <SortCard key={sort.id} sort={sort} />
          ))}
        </section>
      )}
    </div>
  );
}

export function parseSortIndexFilter(value: string | string[] | undefined): SortIndexFilter {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (
    rawValue === "draft" ||
    rawValue === "processing" ||
    rawValue === "ready_for_review" ||
    rawValue === "exported" ||
    rawValue === "failed"
  ) {
    return rawValue;
  }

  return "all";
}
