import type PgBoss from "pg-boss";

import { logger } from "@/lib/logger";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createPrivacySafeFailure,
  getWorkflowDurationMs
} from "@/modules/activity/privacy-safe-observability";
import {
  createSupabaseFullSortStore,
  FULL_SORT_JOB_NAME,
  handleFullSortJob,
  type FullSortJobData
} from "@/modules/sorts/full-sort-job";

export async function registerFullSortWorker(boss: PgBoss) {
  await boss.createQueue(FULL_SORT_JOB_NAME);

  await boss.work<FullSortJobData>(FULL_SORT_JOB_NAME, async (jobs) => {
    const startedAt = Date.now();

    logger.info(
      {
        eventType: "worker_jobs_received",
        jobName: FULL_SORT_JOB_NAME,
        jobCount: jobs.length
      },
      "Worker received full-organization jobs."
    );

    try {
      const supabase = createSupabaseServiceRoleClient();

      if (!supabase) {
        throw new Error("Supabase service role client is required for full-organization jobs.");
      }

      const store = createSupabaseFullSortStore(supabase);

      await Promise.all(
        jobs.map((job) =>
          handleFullSortJob({
            store,
            data: job.data
          })
        )
      );

      logger.info(
        {
          eventType: "worker_jobs_completed",
          jobName: FULL_SORT_JOB_NAME,
          jobCount: jobs.length,
          durationMs: getWorkflowDurationMs(startedAt)
        },
        "Worker completed full-organization jobs."
      );
    } catch (error) {
      const failure = createPrivacySafeFailure({
        workflowName: "Full organization worker",
        error
      });

      logger.error(
        {
          eventType: "worker_jobs_failed",
          jobName: FULL_SORT_JOB_NAME,
          jobCount: jobs.length,
          durationMs: getWorkflowDurationMs(startedAt),
          failureCategory: failure.category
        },
        "Worker failed full-organization jobs."
      );

      throw error;
    }
  });
}
