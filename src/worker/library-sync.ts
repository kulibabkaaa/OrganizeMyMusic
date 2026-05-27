import type PgBoss from "pg-boss";

import { logger } from "@/lib/logger";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createPrivacySafeFailure,
  getWorkflowDurationMs
} from "@/modules/activity/privacy-safe-observability";
import {
  createSupabaseLibrarySyncStore,
  handleLibrarySyncJob,
  LIBRARY_SYNC_JOB_NAME,
  type LibrarySyncJobData
} from "@/modules/library-syncs/queue";

export async function registerLibrarySyncWorker(boss: PgBoss) {
  await boss.createQueue(LIBRARY_SYNC_JOB_NAME);

  await boss.work<LibrarySyncJobData>(LIBRARY_SYNC_JOB_NAME, async (jobs) => {
    const startedAt = Date.now();

    logger.info(
      {
        eventType: "worker_jobs_received",
        jobName: LIBRARY_SYNC_JOB_NAME,
        jobCount: jobs.length
      },
      "Worker received library sync jobs."
    );

    try {
      const supabase = createSupabaseServiceRoleClient();

      if (!supabase) {
        throw new Error("Supabase service role client is required for library sync jobs.");
      }

      const store = createSupabaseLibrarySyncStore(supabase);

      await Promise.all(
        jobs.map((job) =>
          handleLibrarySyncJob({
            store,
            data: job.data
          })
        )
      );

      logger.info(
        {
          eventType: "worker_jobs_completed",
          jobName: LIBRARY_SYNC_JOB_NAME,
          jobCount: jobs.length,
          durationMs: getWorkflowDurationMs(startedAt)
        },
        "Worker completed library sync jobs."
      );
    } catch (error) {
      const failure = createPrivacySafeFailure({
        workflowName: "Library sync worker",
        error
      });

      logger.error(
        {
          eventType: "worker_jobs_failed",
          jobName: LIBRARY_SYNC_JOB_NAME,
          jobCount: jobs.length,
          durationMs: getWorkflowDurationMs(startedAt),
          failureCategory: failure.category
        },
        "Worker failed library sync jobs."
      );

      throw error;
    }
  });
}
