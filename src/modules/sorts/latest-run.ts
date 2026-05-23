import type { SupabaseClient } from "@supabase/supabase-js";

import type { PaymentStatus, SortRunState } from "@/types/domain";

export interface LatestSortRunSummary {
  id: string;
  state: SortRunState;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  playlistCount: number;
  selectedPlaylistCount: number;
  applePlaylistIdCount: number;
  trackAssignmentCount: number;
}

type SortRunRow = {
  id: string;
  state: SortRunState;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
};

type SortPlaylistRow = {
  id: string;
  selected: boolean;
  apple_playlist_id: string | null;
};

type SortPlaylistTrackRow = {
  id: string;
};

export interface LatestSortRunStore {
  getLatestSortRunSummary(input: {
    userId: string;
  }): Promise<LatestSortRunSummary | null>;
}

export function summarizeLatestSortRun(input: {
  sortRun: SortRunRow;
  playlists: SortPlaylistRow[];
  playlistTracks: SortPlaylistTrackRow[];
}): LatestSortRunSummary {
  return {
    id: input.sortRun.id,
    state: input.sortRun.state,
    paymentStatus: input.sortRun.payment_status,
    createdAt: input.sortRun.created_at,
    updatedAt: input.sortRun.updated_at,
    playlistCount: input.playlists.length,
    selectedPlaylistCount: input.playlists.filter((playlist) => playlist.selected).length,
    applePlaylistIdCount: input.playlists.filter((playlist) => playlist.apple_playlist_id).length,
    trackAssignmentCount: input.playlistTracks.length
  };
}

export function createSupabaseLatestSortRunStore(
  supabase: SupabaseClient
): LatestSortRunStore {
  return {
    async getLatestSortRunSummary(input) {
      const { data: sortRun, error: sortRunError } = await supabase
        .from("sort_runs")
        .select("id,state,payment_status,created_at,updated_at")
        .eq("user_id", input.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sortRunError) {
        throw new Error(sortRunError.message);
      }

      if (!sortRun) {
        return null;
      }

      const sortRunRow = sortRun as SortRunRow;
      const { data: playlists, error: playlistsError } = await supabase
        .from("sort_playlists")
        .select("id,selected,apple_playlist_id")
        .eq("sort_run_id", sortRunRow.id);

      if (playlistsError || !playlists) {
        throw new Error(playlistsError?.message ?? "Unable to load latest sort playlists.");
      }

      const playlistRows = playlists as SortPlaylistRow[];
      const playlistIds = playlistRows.map((playlist) => playlist.id);

      if (playlistIds.length === 0) {
        return summarizeLatestSortRun({
          sortRun: sortRunRow,
          playlists: playlistRows,
          playlistTracks: []
        });
      }

      const { data: playlistTracks, error: playlistTracksError } = await supabase
        .from("sort_playlist_tracks")
        .select("id")
        .in("sort_playlist_id", playlistIds);

      if (playlistTracksError || !playlistTracks) {
        throw new Error(
          playlistTracksError?.message ?? "Unable to load latest sort playlist tracks."
        );
      }

      return summarizeLatestSortRun({
        sortRun: sortRunRow,
        playlists: playlistRows,
        playlistTracks: playlistTracks as SortPlaylistTrackRow[]
      });
    }
  };
}
