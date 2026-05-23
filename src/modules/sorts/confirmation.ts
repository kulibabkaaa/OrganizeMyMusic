import type { SupabaseClient } from "@supabase/supabase-js";

import type { PreviewSortRun } from "@/modules/sorts/preview-snapshot";
import {
  getVisiblePreviewTrackCount,
  type PreviewSelection
} from "@/modules/sorts/preview-selection";
import type { SortRunState } from "@/types/domain";

export const PLAYLIST_CREATION_JOB_NAME = "playlist-create";

export interface PlaylistCreationJobData {
  sortRunId: string;
  userId: string;
}

export interface PlaylistCreationQueue {
  createQueue?(name: typeof PLAYLIST_CREATION_JOB_NAME): Promise<void>;
  send(
    name: typeof PLAYLIST_CREATION_JOB_NAME,
    data: PlaylistCreationJobData,
    options: {
      retryLimit: number;
      retryDelay: number;
      retryBackoff: boolean;
      singletonKey: string;
    }
  ): Promise<string | null>;
}

export interface ConfirmedPlaylistSelection {
  generatedPlaylistId: string;
  removedTrackFingerprints: string[];
  includedNormalizedTrackIds: string[];
}

export interface SortRunConfirmationStore {
  getSortRunForConfirmation(input: {
    sortRunId: string;
    userId: string;
  }): Promise<PreviewSortRun | null>;
  saveConfirmation(input: {
    sortRun: PreviewSortRun;
    selectedPlaylists: ConfirmedPlaylistSelection[];
  }): Promise<void>;
  createJobEvent(input: {
    sortRunId: string;
    stage: string;
    level: "info" | "warn" | "error";
    message: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
}

export type ConfirmSortRunResult =
  | {
      status: "confirmed";
      sortRunId: string;
      state: Extract<SortRunState, "creating_playlists">;
      selectedPlaylistCount: number;
      selectedTrackCount: number;
      jobId: string | null;
    }
  | {
      status: "already_confirmed";
      sortRunId: string;
      state: Extract<SortRunState, "creating_playlists" | "completed">;
    }
  | {
      status:
        | "not_found"
        | "missing_preview"
        | "invalid_state"
        | "invalid_selection"
        | "empty_selection";
      message: string;
    };

export async function confirmSortRun(input: {
  store: SortRunConfirmationStore;
  queue: PlaylistCreationQueue;
  sortRunId: string;
  userId: string;
  selection: PreviewSelection;
}): Promise<ConfirmSortRunResult> {
  await input.queue.createQueue?.(PLAYLIST_CREATION_JOB_NAME);

  const sortRun = await input.store.getSortRunForConfirmation({
    sortRunId: input.sortRunId,
    userId: input.userId
  });

  if (!sortRun) {
    return {
      status: "not_found",
      message: "Sort run not found."
    };
  }

  if (sortRun.state === "creating_playlists" || sortRun.state === "completed") {
    return {
      status: "already_confirmed",
      sortRunId: sortRun.id,
      state: sortRun.state
    };
  }

  if (sortRun.state !== "preview_ready") {
    return {
      status: "invalid_state",
      message: "Only preview-ready sort runs can be confirmed."
    };
  }

  if (!sortRun.previewSnapshot) {
    return {
      status: "missing_preview",
      message: "Preview snapshot is required before confirmation."
    };
  }

  const selectedPlaylistIds = [...new Set(input.selection.selectedPlaylistIds)];
  const knownPlaylistIds = new Set(
    sortRun.previewSnapshot.playlists.map((playlist) => playlist.id)
  );
  const hasUnknownPlaylist = selectedPlaylistIds.some((playlistId) => !knownPlaylistIds.has(playlistId));

  if (hasUnknownPlaylist) {
    return {
      status: "invalid_selection",
      message: "Selection includes a playlist outside this preview."
    };
  }

  const selectedPlaylists = selectedPlaylistIds.flatMap((playlistId): ConfirmedPlaylistSelection[] => {
    const playlist = sortRun.previewSnapshot?.playlists.find((item) => item.id === playlistId);

    if (!playlist) {
      return [];
    }

    const removedTrackFingerprints = [
      ...new Set(input.selection.removedTrackFingerprintsByPlaylistId[playlistId] ?? [])
    ];
    const removedTrackFingerprintSet = new Set(removedTrackFingerprints);
    const includedNormalizedTrackIds = playlist.tracks.flatMap((track) =>
      !removedTrackFingerprintSet.has(track.fingerprint) && track.normalizedTrackId
        ? [track.normalizedTrackId]
        : []
    );

    return [
      {
        generatedPlaylistId: playlist.id,
        removedTrackFingerprints,
        includedNormalizedTrackIds
      }
    ];
  });
  const selectedPlaylistCount = selectedPlaylists.length;
  const selectedTrackCount = sortRun.previewSnapshot.playlists.reduce(
    (count, playlist) =>
      count + getVisiblePreviewTrackCount(sortRun.previewSnapshot!, input.selection, playlist.id),
    0
  );

  if (selectedPlaylistCount === 0 || selectedTrackCount === 0) {
    return {
      status: "empty_selection",
      message: "Select at least one playlist with at least one track before confirming."
    };
  }

  await input.store.saveConfirmation({
    sortRun,
    selectedPlaylists
  });

  const jobId = await input.queue.send(
    PLAYLIST_CREATION_JOB_NAME,
    {
      sortRunId: sortRun.id,
      userId: sortRun.userId
    },
    {
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
      singletonKey: sortRun.id
    }
  );

  await input.store.createJobEvent({
    sortRunId: sortRun.id,
    stage: "playlist_creation",
    level: "info",
    message: `Playlist creation queued for ${selectedPlaylistCount} playlists and ${selectedTrackCount} tracks.`,
    details: {
      jobId,
      selectedPlaylistCount,
      selectedTrackCount
    }
  });

  return {
    status: "confirmed",
    sortRunId: sortRun.id,
    state: "creating_playlists",
    selectedPlaylistCount,
    selectedTrackCount,
    jobId
  };
}

type SortPlaylistRow = {
  id: string;
  playlist_rules: {
    generatedPlaylistId?: string;
  } | null;
};

export function createSupabaseSortRunConfirmationStore(
  supabase: SupabaseClient,
  getSortRunForConfirmation: SortRunConfirmationStore["getSortRunForConfirmation"]
): SortRunConfirmationStore {
  return {
    getSortRunForConfirmation,

    async saveConfirmation(input) {
      const { data: playlistRows, error: playlistError } = await supabase
        .from("sort_playlists")
        .select("id,playlist_rules")
        .eq("sort_run_id", input.sortRun.id);

      if (playlistError || !playlistRows) {
        throw new Error(playlistError?.message ?? "Unable to load generated playlists.");
      }

      const rows = playlistRows as SortPlaylistRow[];
      const selectedByGeneratedId = new Map(
        input.selectedPlaylists.map((playlist) => [playlist.generatedPlaylistId, playlist])
      );
      const selectedPlaylistRowIds = rows.flatMap((row) =>
        row.playlist_rules?.generatedPlaylistId &&
        selectedByGeneratedId.has(row.playlist_rules.generatedPlaylistId)
          ? [row.id]
          : []
      );

      if (selectedPlaylistRowIds.length !== input.selectedPlaylists.length) {
        throw new Error("Unable to match preview playlists to stored playlists.");
      }

      const { error: deselectError } = await supabase
        .from("sort_playlists")
        .update({ selected: false })
        .eq("sort_run_id", input.sortRun.id);

      if (deselectError) {
        throw new Error(deselectError.message);
      }

      const { error: selectError } = await supabase
        .from("sort_playlists")
        .update({ selected: true })
        .in("id", selectedPlaylistRowIds);

      if (selectError) {
        throw new Error(selectError.message);
      }

      const { error: resetTrackError } = await supabase
        .from("sort_playlist_tracks")
        .update({ removed_by_user: false })
        .in("sort_playlist_id", rows.map((row) => row.id));

      if (resetTrackError) {
        throw new Error(resetTrackError.message);
      }

      for (const row of rows) {
        const selected = row.playlist_rules?.generatedPlaylistId
          ? selectedByGeneratedId.get(row.playlist_rules.generatedPlaylistId)
          : null;
        const includedTrackIds = selected?.includedNormalizedTrackIds ?? [];

        if (!selected || includedTrackIds.length === 0) {
          continue;
        }

        const { error: removeTrackError } = await supabase
          .from("sort_playlist_tracks")
          .update({ removed_by_user: true })
          .eq("sort_playlist_id", row.id)
          .not("normalized_track_id", "in", `(${includedTrackIds.join(",")})`);

        if (removeTrackError) {
          throw new Error(removeTrackError.message);
        }
      }

      const { error: runError } = await supabase
        .from("sort_runs")
        .update({
          state: "creating_playlists",
          updated_at: new Date().toISOString()
        })
        .eq("id", input.sortRun.id)
        .eq("user_id", input.sortRun.userId)
        .eq("state", input.sortRun.state)
        .select("id")
        .single();

      if (runError) {
        throw new Error(runError.message);
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
