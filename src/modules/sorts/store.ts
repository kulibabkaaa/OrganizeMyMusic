import { demoSortRun } from "@/lib/sample-data";
import type { SortRunSummary } from "@/types/domain";

const sortRuns = new Map<string, SortRunSummary>([[demoSortRun.id, demoSortRun]]);

export function saveSortRun(sortRun: SortRunSummary) {
  sortRuns.set(sortRun.id, sortRun);
  return sortRun;
}

export function getStoredSortRun(sortRunId: string) {
  return sortRuns.get(sortRunId) ?? null;
}

export function listStoredSortRuns() {
  return Array.from(sortRuns.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function markSortRunPaid(sortRunId: string) {
  const existing = sortRuns.get(sortRunId);

  if (!existing) {
    return null;
  }

  const next = {
    ...existing,
    paymentStatus: "paid" as const,
    state: existing.state === "preview_ready" ? "paid" : existing.state,
    updatedAt: new Date().toISOString()
  };

  sortRuns.set(sortRunId, next);
  return next;
}

export function markSortRunCompleted(sortRunId: string) {
  const existing = sortRuns.get(sortRunId);

  if (!existing) {
    return null;
  }

  const next = {
    ...existing,
    state: "completed" as const,
    updatedAt: new Date().toISOString()
  };

  sortRuns.set(sortRunId, next);
  return next;
}

