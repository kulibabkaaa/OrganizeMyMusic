import type PgBoss from "pg-boss";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseLibrarySyncStore,
  handleLibrarySyncJob,
  LIBRARY_SYNC_JOB_NAME,
  type LibrarySyncJobData
} from "@/modules/library-syncs/queue";

export async function registerLibrarySyncWorker(boss: PgBoss) {
  await boss.createQueue(LIBRARY_SYNC_JOB_NAME);

  await boss.work<LibrarySyncJobData>(LIBRARY_SYNC_JOB_NAME, async (jobs) => {
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
  });
}
