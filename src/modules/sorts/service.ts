import { demoSortRun } from "@/lib/sample-data";
import type { SortRunSummary } from "@/types/domain";
import { getStoredSortRun, saveSortRun } from "@/modules/sorts/store";

export async function createDraftSortRun() {
  return saveSortRun({
    ...demoSortRun,
    id: `sort_${Date.now()}`,
    state: "draft"
  } satisfies SortRunSummary);
}

export async function getSortPreview(sortRunId: string) {
  return getStoredSortRun(sortRunId);
}
