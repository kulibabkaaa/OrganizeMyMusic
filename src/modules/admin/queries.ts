import { demoJobEvents, demoSortRun } from "@/lib/sample-data";
import { getStoredSortRun, listStoredSortRuns } from "@/modules/sorts/store";

export async function getAdminOverview() {
  return {
    activeSortRuns: listStoredSortRuns().length,
    failedSortRuns: 0,
    pendingPayments: 1,
    sampleRun: demoSortRun
  };
}

export async function getAdminSortRun(sortRunId: string) {
  return {
    run: getStoredSortRun(sortRunId),
    events: demoJobEvents.filter((event) => event.sortRunId === sortRunId)
  };
}
