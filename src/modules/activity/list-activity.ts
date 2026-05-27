import type { LibrarySyncSummary } from "@/modules/library-syncs/queue";
import type { RecentSortRunSummary } from "@/modules/sorts/list-sort-runs";

export interface DashboardActivityItem {
  id: string;
  label: string;
  detail: string;
  createdAt: string;
}

export function listDashboardActivity(input: {
  latestSync: LibrarySyncSummary | null;
  recentSorts: RecentSortRunSummary[];
}): DashboardActivityItem[] {
  const items: DashboardActivityItem[] = [];

  if (input.latestSync) {
    if (input.latestSync.status === "completed") {
      items.push({
        id: `library-${input.latestSync.id}`,
        label: "Library synced",
        detail: `${input.latestSync.normalizedTrackCount.toLocaleString("en-US")} songs indexed`,
        createdAt: input.latestSync.updatedAt
      });
    }

    if (input.latestSync.status === "failed") {
      items.push({
        id: `library-${input.latestSync.id}`,
        label: "Library sync needs attention",
        detail: "Failed at library sync. Retry from Library.",
        createdAt: input.latestSync.updatedAt
      });
    }
  }

  for (const sort of input.recentSorts.slice(0, 3)) {
    items.push({
      id: `sort-${sort.id}`,
      label: `${sort.title}`,
      detail: sort.uiStatus === "failed" ? "Failed Sort. View issue / Retry." : sort.nextActionLabel,
      createdAt: sort.updatedAt
    });
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
}
