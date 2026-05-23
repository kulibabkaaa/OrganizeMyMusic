import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  SortRunRetryStore,
  SortRunRetrySummary
} from "@/modules/recovery/retry";
import type { SortRunState } from "@/types/domain";

type SortRunRetryRow = {
  id: string;
  user_id: string;
  state: SortRunState;
};

export function createSupabaseSortRunRetryStore(
  supabase: SupabaseClient
): SortRunRetryStore {
  return {
    async getSortRunForRetry(input): Promise<SortRunRetrySummary | null> {
      const { data, error } = await supabase
        .from("sort_runs")
        .select("id,user_id,state")
        .eq("id", input.sortRunId)
        .eq("user_id", input.userId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      const row = data as SortRunRetryRow;

      return {
        id: row.id,
        userId: row.user_id,
        state: row.state
      };
    },

    async markCreatingPlaylists(input) {
      const { error } = await supabase
        .from("sort_runs")
        .update({
          state: "creating_playlists",
          updated_at: new Date().toISOString()
        })
        .eq("id", input.sortRunId)
        .eq("user_id", input.userId)
        .eq("state", "failed");

      if (error) {
        throw new Error(error.message);
      }
    },

    async createJobEvent(input) {
      const { error } = await supabase.from("job_events").insert({
        sort_run_id: input.sortRunId,
        stage: input.stage,
        level: input.level,
        message: input.message,
        details: input.details ?? null
      });

      if (error) {
        throw new Error(error.message);
      }
    }
  };
}
