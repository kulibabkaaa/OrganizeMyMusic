import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getSortPrimaryRoute,
  getSortUiStatus,
  type SortUiStatus
} from "@/modules/sorts/ui-status";
import type { PaymentStatus, SortRunState } from "@/types/domain";

export interface RecentSortRunSummary {
  id: string;
  title: string;
  uiStatus: SortUiStatus;
  state: SortRunState;
  paymentStatus: PaymentStatus;
  provider: "Apple Music";
  recipeCount: number;
  playlistCount: number;
  updatedAt: string;
  primaryRoute: string;
  nextActionLabel: string;
}

export interface ActiveSortCounts {
  draft: number;
  processing: number;
  readyForReview: number;
}

export type SortIndexFilter =
  | "all"
  | "draft"
  | "processing"
  | "ready_for_review"
  | "exported"
  | "failed";

type SortRunListRow = {
  id: string;
  name?: string | null;
  source_provider?: "apple_music" | null;
  state: SortRunState;
  payment_status: PaymentStatus;
  preview_snapshot: unknown | null;
  updated_at: string;
};

type PlaylistRequestSummaryRow = {
  parsed_rules: {
    title?: string;
  } | null;
};

type SortPlaylistSummaryRow = {
  id: string;
  title: string;
  apple_playlist_id: string | null;
};

export function summarizeRecentSortRun(input: {
  sortRun: SortRunListRow;
  playlistRequests: PlaylistRequestSummaryRow[];
  playlists: SortPlaylistSummaryRow[];
}): RecentSortRunSummary {
  const uiStatus = getSortUiStatus({
    state: input.sortRun.state,
    paymentStatus: input.sortRun.payment_status,
    hasPreviewSnapshot: Boolean(input.sortRun.preview_snapshot),
    generatedPlaylistCount: input.playlists.length,
    applePlaylistIdCount: input.playlists.filter((playlist) => playlist.apple_playlist_id).length
  });

  return {
    id: input.sortRun.id,
    title: getSortTitle(input.sortRun.name, input.playlistRequests, input.playlists),
    uiStatus,
    state: input.sortRun.state,
    paymentStatus: input.sortRun.payment_status,
    provider: "Apple Music",
    recipeCount: input.playlistRequests.length || input.playlists.length,
    playlistCount: input.playlists.length,
    updatedAt: input.sortRun.updated_at,
    primaryRoute: getSortPrimaryRoute(input.sortRun.id, uiStatus),
    nextActionLabel: getSortNextActionLabel(uiStatus)
  };
}

export function getActiveSortCounts(sorts: RecentSortRunSummary[]): ActiveSortCounts {
  return {
    draft: sorts.filter((sort) => sort.uiStatus === "draft").length,
    processing: sorts.filter((sort) =>
      ["preview_generating", "paid", "processing", "exporting"].includes(sort.uiStatus)
    ).length,
    readyForReview: sorts.filter((sort) => sort.uiStatus === "ready_for_review").length
  };
}

export function filterSortsForIndex(
  sorts: RecentSortRunSummary[],
  filter: SortIndexFilter
) {
  if (filter === "all") {
    return sorts;
  }

  if (filter === "processing") {
    return sorts.filter((sort) =>
      ["preview_generating", "paid", "processing", "exporting"].includes(sort.uiStatus)
    );
  }

  return sorts.filter((sort) => sort.uiStatus === filter);
}

export function getSortIndexFilterCounts(sorts: RecentSortRunSummary[]) {
  return {
    all: sorts.length,
    draft: filterSortsForIndex(sorts, "draft").length,
    processing: filterSortsForIndex(sorts, "processing").length,
    ready_for_review: filterSortsForIndex(sorts, "ready_for_review").length,
    exported: filterSortsForIndex(sorts, "exported").length,
    failed: filterSortsForIndex(sorts, "failed").length
  } satisfies Record<SortIndexFilter, number>;
}

export function getSortNextActionLabel(status: SortUiStatus) {
  switch (status) {
    case "draft":
      return "Continue editing";
    case "preview_generating":
    case "paid":
    case "processing":
    case "exporting":
      return "View progress";
    case "preview_ready":
    case "awaiting_payment":
      return "View preview";
    case "ready_for_review":
      return "Review playlists";
    case "exported":
      return "View export";
    case "failed":
      return "View issue / Retry";
  }
}

export function createSupabaseRecentSortRunStore(supabase: SupabaseClient) {
  return {
    async listSortRuns(input: { userId: string; limit?: number }) {
      return listSortRunsFromSupabase(supabase, {
        userId: input.userId,
        limit: input.limit ?? 50
      });
    },
    async listRecentSortRuns(input: { userId: string; limit?: number }) {
      return listSortRunsFromSupabase(supabase, {
        userId: input.userId,
        limit: input.limit ?? 6
      });
    }
  };
}

async function listSortRunsFromSupabase(
  supabase: SupabaseClient,
  input: { userId: string; limit: number }
) {
  const { data: sortRuns, error: sortRunError } = await supabase
    .from("sort_runs")
        .select("id,name,source_provider,state,payment_status,preview_snapshot,updated_at")
    .eq("user_id", input.userId)
    .order("updated_at", { ascending: false })
    .limit(input.limit);

  if (sortRunError || !sortRuns) {
    throw new Error(sortRunError?.message ?? "Unable to load Sorts.");
  }

  const sortRunRows = sortRuns as SortRunListRow[];
  const sortRunIds = sortRunRows.map((sortRun) => sortRun.id);

  if (sortRunIds.length === 0) {
    return [];
  }

  const { data: playlistRequests, error: requestError } = await supabase
    .from("playlist_requests")
    .select("sort_run_id,parsed_rules")
    .in("sort_run_id", sortRunIds);

  if (requestError || !playlistRequests) {
    throw new Error(requestError?.message ?? "Unable to load Sort recipes.");
  }

  const { data: playlists, error: playlistError } = await supabase
    .from("sort_playlists")
    .select("id,sort_run_id,title,apple_playlist_id")
    .in("sort_run_id", sortRunIds);

  if (playlistError || !playlists) {
    throw new Error(playlistError?.message ?? "Unable to load Sort playlists.");
  }

  return sortRunRows.map((sortRun) =>
    summarizeRecentSortRun({
      sortRun,
      playlistRequests: playlistRequests
        .filter((request) => request.sort_run_id === sortRun.id)
        .map((request) => ({
          parsed_rules: request.parsed_rules as PlaylistRequestSummaryRow["parsed_rules"]
        })),
      playlists: playlists
        .filter((playlist) => playlist.sort_run_id === sortRun.id)
        .map((playlist) => ({
          id: playlist.id as string,
          title: playlist.title as string,
          apple_playlist_id: playlist.apple_playlist_id as string | null
        }))
    })
  );
}

function getSortTitle(
  sortName: string | null | undefined,
  playlistRequests: PlaylistRequestSummaryRow[],
  playlists: SortPlaylistSummaryRow[]
) {
  return sortName ?? playlistRequests[0]?.parsed_rules?.title ?? playlists[0]?.title ?? "Untitled Sort";
}
