import { demoJobEvents, demoSortRun } from "@/lib/sample-data";
import { getStoredSortRun, listStoredSortRuns } from "@/modules/sorts/store";

export async function getAdminOverview() {
  const sortRuns = listStoredSortRuns();

  return {
    activeSortRuns: sortRuns.length,
    failedSortRuns: sortRuns.filter(
      (sortRun) => sortRun.state === "failed" || sortRun.paymentStatus === "failed"
    ).length,
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
