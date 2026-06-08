import type { SupabaseClient } from "@supabase/supabase-js";

import type { SortRunState } from "@/types/domain";

export type ExportStepStatus = "done" | "live" | "pending" | "failed";

export interface ExportProgressStep {
  id: "creating" | "adding" | "finalizing" | "done";
  label: string;
  status: ExportStepStatus;
}

export interface SortExportPlaylistSummary {
  id: string;
  title: string;
  trackCount: number;
  applePlaylistId: string | null;
  appleMusicUrl: string | null;
}

export interface SortExportSummary {
  sortId: string;
  sortName: string;
  state: Extract<SortRunState, "creating_playlists" | "completed" | "failed">;
  updatedAt: string;
  playlists: SortExportPlaylistSummary[];
}

export interface SortExportProgress {
  percent: number;
  currentStep: string;
  steps: ExportProgressStep[];
}

export interface SortExportTotals {
  createdPlaylistCount: number;
  totalTrackCount: number;
}

export interface SortExportSummaryStore {
  getExportSummary(input: {
    sortId: string;
    userId: string;
  }): Promise<SortExportSummary | null>;
}

export function getExportProgress(summary: SortExportSummary): SortExportProgress {
  if (summary.state === "failed") {
    return {
      percent: 0,
      currentStep: "Needs attention",
      steps: exportStepLabels.map((step, index) => ({
        ...step,
        status: index === 0 ? "failed" : "pending"
      }))
    };
  }

  if (summary.state === "completed") {
    return {
      percent: 100,
      currentStep: "Done",
      steps: exportStepLabels.map((step) => ({ ...step, status: "done" }))
    };
  }

  const createdPlaylistCount = summary.playlists.filter(
    (playlist) => playlist.applePlaylistId
  ).length;
  const allPlaylistShellsCreated =
    summary.playlists.length > 0 && createdPlaylistCount === summary.playlists.length;

  if (allPlaylistShellsCreated) {
    return {
      percent: 75,
      currentStep: "Finalizing",
      steps: [
        { ...exportStepLabels[0], status: "done" },
        { ...exportStepLabels[1], status: "done" },
        { ...exportStepLabels[2], status: "live" },
        { ...exportStepLabels[3], status: "pending" }
      ]
    };
  }

  if (createdPlaylistCount > 0) {
    return {
      percent: 50,
      currentStep: "Adding tracks",
      steps: [
        { ...exportStepLabels[0], status: "done" },
        { ...exportStepLabels[1], status: "live" },
        { ...exportStepLabels[2], status: "pending" },
        { ...exportStepLabels[3], status: "pending" }
      ]
    };
  }

  return {
    percent: 25,
    currentStep: "Creating playlists",
    steps: [
      { ...exportStepLabels[0], status: "live" },
      { ...exportStepLabels[1], status: "pending" },
      { ...exportStepLabels[2], status: "pending" },
      { ...exportStepLabels[3], status: "pending" }
    ]
  };
}

export function summarizeExportTotals(summary: SortExportSummary): SortExportTotals {
  return {
    createdPlaylistCount: summary.playlists.filter((playlist) => playlist.applePlaylistId).length,
    totalTrackCount: summary.playlists.reduce((count, playlist) => count + playlist.trackCount, 0)
  };
}

export function createSupabaseSortExportSummaryStore(
  supabase: SupabaseClient
): SortExportSummaryStore {
  return {
    async getExportSummary(input) {
      const { data: sortRun, error: sortRunError } = await supabase
        .from("sort_runs")
        .select("id,name,state,updated_at")
        .eq("id", input.sortId)
        .eq("user_id", input.userId)
        .maybeSingle();

      if (sortRunError) {
        throw new Error(sortRunError.message);
      }

      if (!sortRun) {
        return null;
      }

      const state = sortRun.state as SortRunState;

      if (
        state !== "creating_playlists" &&
        state !== "completed" &&
        state !== "failed"
      ) {
        return null;
      }

      const { data: playlists, error: playlistsError } = await supabase
        .from("sort_playlists")
        .select("id,title,apple_playlist_id")
        .eq("sort_run_id", sortRun.id)
        .eq("selected", true)
        .order("created_at", { ascending: true });

      if (playlistsError || !playlists) {
        throw new Error(playlistsError?.message ?? "Unable to load exported playlists.");
      }

      const playlistSummaries = await Promise.all(
        playlists.map(async (playlist) => {
          const { count, error: trackError } = await supabase
            .from("sort_playlist_tracks")
            .select("id", { count: "exact", head: true })
            .eq("sort_playlist_id", playlist.id)
            .eq("removed_by_user", false);

          if (trackError) {
            throw new Error(trackError.message);
          }

          return {
            id: playlist.id as string,
            title: playlist.title as string,
            trackCount: count ?? 0,
            applePlaylistId: playlist.apple_playlist_id as string | null,
            appleMusicUrl: getAppleMusicPlaylistUrl(playlist.apple_playlist_id as string | null)
          };
        })
      );

      return {
        sortId: sortRun.id as string,
        sortName: (sortRun.name as string | null) ?? "Untitled Sort",
        state: state as SortExportSummary["state"],
        updatedAt: sortRun.updated_at as string,
        playlists: playlistSummaries
      };
    }
  };
}

function getAppleMusicPlaylistUrl(applePlaylistId: string | null) {
  return applePlaylistId ? `https://music.apple.com/library/playlist/${applePlaylistId}` : null;
}

const exportStepLabels = [
  { id: "creating", label: "Creating playlists" },
  { id: "adding", label: "Adding tracks" },
  { id: "finalizing", label: "Finalizing" },
  { id: "done", label: "Done" }
] satisfies Array<Pick<ExportProgressStep, "id" | "label">>;
