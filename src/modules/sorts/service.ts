import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabasePreviewSnapshotStore,
  type PreviewSortRun
} from "@/modules/sorts/preview-snapshot";

export type SortPreviewLoadResult =
  | {
      status: "ready";
      sortRun: PreviewSortRun;
    }
  | {
      status: "missing_config" | "not_found";
    }
  | {
      status: "error";
      message: string;
    };

export async function getSortPreview(
  sortRunId: string,
  userId: string
): Promise<SortPreviewLoadResult> {
  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return {
      status: "missing_config"
    };
  }

  try {
    const sortRun = await createSupabasePreviewSnapshotStore(supabase).getSortRunForPreview({
      sortRunId,
      userId
    });

    if (!sortRun) {
      return {
        status: "not_found"
      };
    }

    return {
      status: "ready",
      sortRun
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to load preview."
    };
  }
}
