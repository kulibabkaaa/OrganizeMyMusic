import { demoJobEvents } from "@/lib/sample-data";
import { getStoredSortRun, listStoredSortRuns } from "@/modules/sorts/store";

export async function getSortRunById(sortRunId: string) {
  return getStoredSortRun(sortRunId);
}

export async function listAdminSortRuns() {
  return listStoredSortRuns();
}

export async function listJobEvents(sortRunId: string) {
  return demoJobEvents.filter((event) => event.sortRunId === sortRunId);
}
