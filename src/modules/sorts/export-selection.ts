import type { SupabaseClient } from "@supabase/supabase-js";

import {
  PLAYLIST_CREATION_JOB_NAME,
  type PlaylistCreationJobData
} from "@/modules/sorts/playlist-creation-queue";
import type { PreviewSortRun } from "@/modules/sorts/preview-snapshot";
import type { SortRunState } from "@/types/domain";

export interface PlaylistExportQueue {
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

export interface ReviewedExportSelection {
  selectedPlaylistIds: string[];
  removedTrackFingerprintsByPlaylistId: Record<string, string[]>;
  renamedPlaylistTitlesById: Record<string, string>;
}

export interface ReviewedPlaylistExport {
  generatedPlaylistId: string;
  title: string;
  removedTrackFingerprints: string[];
  includedNormalizedTrackIds: string[];
}

export interface SortRunExportStore {
  getSortRunForExport(input: {
    sortRunId: string;
    userId: string;
  }): Promise<PreviewSortRun | null>;
  saveExportSelection(input: {
    sortRun: PreviewSortRun;
    selectedPlaylists: ReviewedPlaylistExport[];
  }): Promise<void>;
  createJobEvent(input: {
    sortRunId: string;
    stage: string;
    level: "info" | "warn" | "error";
    message: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
}

export type ExportReviewedPlaylistsResult =
  | {
      status: "exporting";
      sortRunId: string;
      state: Extract<SortRunState, "creating_playlists">;
      selectedPlaylistCount: number;
      selectedTrackCount: number;
      jobId: string | null;
    }
  | {
      status: "already_exporting";
      sortRunId: string;
      state: Extract<SortRunState, "creating_playlists">;
    }
  | {
      status: "already_exported";
      sortRunId: string;
      state: Extract<SortRunState, "completed">;
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

export async function exportReviewedPlaylists(input: {
  store: SortRunExportStore;
  queue: PlaylistExportQueue;
  sortRunId: string;
  userId: string;
  selection: ReviewedExportSelection;
}): Promise<ExportReviewedPlaylistsResult> {
  await input.queue.createQueue?.(PLAYLIST_CREATION_JOB_NAME);

  const sortRun = await input.store.getSortRunForExport({
    sortRunId: input.sortRunId,
    userId: input.userId
  });

  if (!sortRun) {
    return {
      status: "not_found",
      message: "Sort run not found."
    };
  }

  if (sortRun.state === "creating_playlists") {
    return {
      status: "already_exporting",
      sortRunId: sortRun.id,
      state: sortRun.state
    };
  }

  if (sortRun.state === "completed") {
    return {
      status: "already_exported",
      sortRunId: sortRun.id,
      state: sortRun.state
    };
  }

  if (
    sortRun.state !== "preview_ready" &&
    sortRun.state !== "paid" &&
    sortRun.state !== "failed"
  ) {
    return {
      status: "invalid_state",
      message: "Generated playlists must be ready for review before export."
    };
  }

  if (!sortRun.previewSnapshot) {
    return {
      status: "missing_preview",
      message: "Generated playlists are required before export."
    };
  }

  const selectedPlaylistIds = [...new Set(input.selection.selectedPlaylistIds)];
  const playlistsById = new Map(
    sortRun.previewSnapshot.playlists.map((playlist) => [playlist.id, playlist])
  );
  const hasUnknownPlaylist = selectedPlaylistIds.some(
    (playlistId) => !playlistsById.has(playlistId)
  );

  if (hasUnknownPlaylist) {
    return {
      status: "invalid_selection",
      message: "Export selection includes a playlist outside this review."
    };
  }

  const selectedPlaylists = selectedPlaylistIds.flatMap((playlistId): ReviewedPlaylistExport[] => {
    const playlist = playlistsById.get(playlistId);

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
    const renamedTitle = input.selection.renamedPlaylistTitlesById[playlist.id]?.trim();

    return includedNormalizedTrackIds.length > 0
      ? [
          {
            generatedPlaylistId: playlist.id,
            title: renamedTitle || playlist.title,
            removedTrackFingerprints,
            includedNormalizedTrackIds
          }
        ]
      : [];
  });
  const selectedPlaylistCount = selectedPlaylists.length;
  const selectedTrackCount = selectedPlaylists.reduce(
    (count, playlist) => count + playlist.includedNormalizedTrackIds.length,
    0
  );

  if (selectedPlaylistCount === 0 || selectedTrackCount === 0) {
    return {
      status: "empty_selection",
      message: "Select at least one playlist with at least one track before export."
    };
  }

  await input.store.saveExportSelection({
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
    stage: "playlist_export",
    level: "info",
    message: `Apple Music export queued for ${selectedPlaylistCount} playlists and ${selectedTrackCount} tracks.`,
    details: {
      jobId,
      selectedPlaylistCount,
      selectedTrackCount
    }
  });

  return {
    status: "exporting",
    sortRunId: sortRun.id,
    state: "creating_playlists",
    selectedPlaylistCount,
    selectedTrackCount,
    jobId
  };
}

type SortPlaylistRow = {
  id: string;
  playlist_id: string | null;
  playlist_rules: {
    generatedPlaylistId?: string;
  } | null;
};

type PlaylistGenerationIdRow = {
  id: string;
};

type PlaylistExportIdRow = {
  id: string;
};

export function createSupabaseSortRunExportStore(
  supabase: SupabaseClient,
  getSortRunForExport: SortRunExportStore["getSortRunForExport"]
): SortRunExportStore {
  return {
    getSortRunForExport,

    async saveExportSelection(input) {
      const { data: playlistRows, error: playlistError } = await supabase
        .from("sort_playlists")
        .select("id,playlist_id,playlist_rules")
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
        throw new Error("Unable to match reviewed playlists to stored playlists.");
      }

      const { error: deselectError } = await supabase
        .from("sort_playlists")
        .update({ selected: false })
        .eq("sort_run_id", input.sortRun.id);

      if (deselectError) {
        throw new Error(deselectError.message);
      }

      for (const row of rows) {
        const selected = row.playlist_rules?.generatedPlaylistId
          ? selectedByGeneratedId.get(row.playlist_rules.generatedPlaylistId)
          : null;

        if (!selected) {
          continue;
        }

        const { error: playlistUpdateError } = await supabase
          .from("sort_playlists")
          .update({
            selected: true,
            title: selected.title
          })
          .eq("id", row.id)
          .eq("sort_run_id", input.sortRun.id);

        if (playlistUpdateError) {
          throw new Error(playlistUpdateError.message);
        }
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

      const selectedRows = rows.filter(
        (row) =>
          row.playlist_rules?.generatedPlaylistId &&
          selectedByGeneratedId.has(row.playlist_rules.generatedPlaylistId)
      );
      const now = new Date().toISOString();

      for (const row of selectedRows) {
        if (!row.playlist_id || !row.playlist_rules?.generatedPlaylistId) {
          continue;
        }

        const selected = selectedByGeneratedId.get(row.playlist_rules.generatedPlaylistId);

        if (!selected) {
          continue;
        }

        const { error: generationError } = await supabase
          .from("playlist_generations")
          .update({
            status: "exporting",
            updated_at: now
          })
          .eq("playlist_id", row.playlist_id)
          .eq("sort_run_id", input.sortRun.id);

        if (generationError) {
          throw new Error(generationError.message);
        }

        const { data: generationRows, error: generationLoadError } = await supabase
          .from("playlist_generations")
          .select("id")
          .eq("playlist_id", row.playlist_id)
          .eq("sort_run_id", input.sortRun.id);

        if (generationLoadError || !generationRows) {
          throw new Error(
            generationLoadError?.message ?? "Unable to load playlist generations."
          );
        }

        const generationIds = (generationRows as PlaylistGenerationIdRow[]).map(
          (generation) => generation.id
        );

        if (generationIds.length > 0) {
          const { error: keepDecisionError } = await supabase
            .from("playlist_generation_tracks")
            .update({ decision: "keep" })
            .in("generation_id", generationIds);

          if (keepDecisionError) {
            throw new Error(keepDecisionError.message);
          }

          const { error: removeDecisionError } = await supabase
            .from("playlist_generation_tracks")
            .update({ decision: "remove" })
            .in("generation_id", generationIds)
            .not("normalized_track_id", "in", `(${selected.includedNormalizedTrackIds.join(",")})`);

          if (removeDecisionError) {
            throw new Error(removeDecisionError.message);
          }
        }

        const { data: exportRows, error: exportLoadError } = await supabase
          .from("playlist_exports")
          .select("id")
          .eq("playlist_id", row.playlist_id)
          .eq("sort_run_id", input.sortRun.id);

        if (exportLoadError) {
          throw new Error(exportLoadError.message);
        }

        const existingExportIds = ((exportRows ?? []) as PlaylistExportIdRow[]).map(
          (exportRow) => exportRow.id
        );
        const exportPayload = {
          status: "queued",
          selected_track_count: selected.includedNormalizedTrackIds.length,
          error_summary: null,
          updated_at: now
        };
        const { error: exportError } =
          existingExportIds.length > 0
            ? await supabase
                .from("playlist_exports")
                .update(exportPayload)
                .in("id", existingExportIds)
            : await supabase.from("playlist_exports").insert({
                user_id: input.sortRun.userId,
                playlist_id: row.playlist_id,
                sort_run_id: input.sortRun.id,
                ...exportPayload
              });

        if (exportError) {
          throw new Error(exportError.message);
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
