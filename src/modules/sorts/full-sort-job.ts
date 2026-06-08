import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createPrivacySafeFailure,
  createPrivacySafeJobDetails,
  getWorkflowDurationMs
} from "@/modules/activity/privacy-safe-observability";
import { createSupabasePlaylistRecipeStore } from "@/modules/playlist-recipes/store";
import {
  createSupabasePreviewSnapshotStore,
  type PreviewSnapshot,
  type PreviewTrackClassification
} from "@/modules/sorts/preview-snapshot";
import { generateRecipePlaylists } from "@/modules/sorts/playlist-rules";
import type {
  GeneratedPlaylist,
  GeneratedPlaylistMatchStats,
  NormalizedTrack,
  PlaylistDimension,
  PlaylistRecipe,
  SortRunState
} from "@/types/domain";

export const FULL_SORT_JOB_NAME = "full-sort";

export interface FullSortJobData {
  sortRunId: string;
  userId: string;
}

export interface PaidSortRunForFullSort {
  id: string;
  userId: string;
  librarySyncId: string | null;
  state: Extract<SortRunState, "paid">;
  paymentStatus: "paid";
  generatedPlaylistCount: number;
}

export interface FullSortQueue {
  createQueue?(name: typeof FULL_SORT_JOB_NAME): Promise<void>;
  send(
    name: typeof FULL_SORT_JOB_NAME,
    data: FullSortJobData,
    options: {
      retryLimit: number;
      retryDelay: number;
      retryBackoff: boolean;
      singletonKey: string;
    }
  ): Promise<string | null>;
}

export interface FullSortStore {
  getPaidSortRunForFullSort(input: {
    sortRunId: string;
    userId: string;
  }): Promise<PaidSortRunForFullSort | null>;
  listRecipesForSort(input: { userId: string; sortRunId: string }): Promise<PlaylistRecipe[]>;
  listTracksForFullSort(input: {
    librarySyncId: string;
    userId: string;
  }): Promise<NormalizedTrack[]>;
  listClassificationsForFullSort(input: {
    normalizedTrackIds: string[];
  }): Promise<PreviewTrackClassification[]>;
  saveFullSortResult(input: {
    sortRun: PaidSortRunForFullSort;
    snapshot: PreviewSnapshot;
  }): Promise<void>;
  createJobEvent(input: {
    sortRunId: string;
    stage: string;
    level: "info" | "warn" | "error";
    message: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
  markSortRunFailed(input: {
    sortRunId: string;
    userId: string;
    errorSummary: string;
  }): Promise<void>;
}

export type QueueFullSortAfterPaymentResult =
  | {
      status: "queued";
      sortRunId: string;
      jobId: string | null;
    }
  | {
      status: "already_ready";
      sortRunId: string;
    }
  | {
      status: "not_ready";
      message: string;
    };

export type FullSortJobResult =
  | {
      status: "completed";
      sortRunId: string;
      playlistCount: number;
      trackCount: number;
    }
  | {
      status: "already_ready";
      sortRunId: string;
      playlistCount: number;
    };

export interface StoredFullSortPlaylist {
  id: string;
  dimension: PlaylistDimension;
  title: string;
  description: string;
  confidenceLabel: GeneratedPlaylist["confidenceLabel"];
  playlistRules: {
    generatedPlaylistId?: string;
    qualityWarnings?: string[];
    matchStats?: GeneratedPlaylistMatchStats;
  } | null;
  tracks: StoredFullSortTrack[];
}

export interface StoredFullSortTrack {
  fingerprint: string;
  normalizedTrackId: string;
  appleSongId?: string;
  name?: string;
  artistName?: string;
  albumName?: string;
  position: number;
  score: number;
  reason: string;
}

export async function queueFullSortAfterPayment(input: {
  store: FullSortStore;
  queue: FullSortQueue;
  sortRunId: string;
  userId: string;
}): Promise<QueueFullSortAfterPaymentResult> {
  const sortRun = await input.store.getPaidSortRunForFullSort({
    sortRunId: input.sortRunId,
    userId: input.userId
  });

  if (!sortRun) {
    return {
      status: "not_ready",
      message: "Organization is not ready to start."
    };
  }

  if (sortRun.generatedPlaylistCount > 0) {
    return {
      status: "already_ready",
      sortRunId: sortRun.id
    };
  }

  await input.queue.createQueue?.(FULL_SORT_JOB_NAME);
  const jobId = await input.queue.send(
    FULL_SORT_JOB_NAME,
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
    stage: "full_sort",
    level: "info",
    message: "Full organization queued after confirmation.",
    details: createPrivacySafeJobDetails({
      eventType: "full_sort_queued",
      jobName: FULL_SORT_JOB_NAME,
      jobId
    })
  });

  return {
    status: "queued",
    sortRunId: sortRun.id,
    jobId
  };
}

export async function handleFullSortJob(input: {
  store: FullSortStore;
  data: FullSortJobData;
  now?: () => string;
}): Promise<FullSortJobResult> {
  const sortRun = await input.store.getPaidSortRunForFullSort(input.data);

  if (!sortRun) {
    throw new Error("Organization is not ready to start.");
  }

  if (sortRun.generatedPlaylistCount > 0) {
    return {
      status: "already_ready",
      sortRunId: sortRun.id,
      playlistCount: sortRun.generatedPlaylistCount
    };
  }

  const startedAt = Date.now();

  try {
    if (!sortRun.librarySyncId) {
      throw new Error("Completed Apple Music library sync is required before full organization.");
    }

    await input.store.createJobEvent({
      sortRunId: sortRun.id,
      stage: "preparing_library",
      level: "info",
      message: "Preparing Apple Music library for full organization.",
      details: createPrivacySafeJobDetails({
        eventType: "full_sort_preparing_library",
        jobName: FULL_SORT_JOB_NAME
      })
    });

    const recipes = await input.store.listRecipesForSort({
      userId: sortRun.userId,
      sortRunId: sortRun.id
    });

    if (recipes.length === 0) {
      throw new Error("At least one Playlist Recipe is required before full organization.");
    }

    const tracks = await input.store.listTracksForFullSort({
      librarySyncId: sortRun.librarySyncId,
      userId: sortRun.userId
    });
    const classifications = await input.store.listClassificationsForFullSort({
      normalizedTrackIds: tracks.map((track) => track.id)
    });
    const fingerprintByNormalizedTrackId = new Map(
      tracks.map((track) => [track.id, track.fingerprint])
    );
    const classificationsWithFingerprints = classifications.map((classification) => ({
      ...classification,
      fingerprint:
        classification.fingerprint ||
        fingerprintByNormalizedTrackId.get(classification.normalizedTrackId) ||
        classification.fingerprint
    }));

    await input.store.createJobEvent({
      sortRunId: sortRun.id,
      stage: "full_sort",
      level: "info",
      message: `Building full organization from ${recipes.length} Playlist Recipes.`,
      details: createPrivacySafeJobDetails({
        eventType: "full_sort_building",
        counts: {
          recipeCount: recipes.length,
          libraryTrackCount: tracks.length,
          classifiedTrackCount: classificationsWithFingerprints.length
        }
      })
    });

    const playlists = generateRecipePlaylists({
      recipes,
      tracks,
      classifications: classificationsWithFingerprints
    });
    const snapshot: PreviewSnapshot = {
      sortRunId: sortRun.id,
      librarySyncId: sortRun.librarySyncId,
      generatedAt: input.now?.() ?? new Date().toISOString(),
      playlists
    };

    await input.store.saveFullSortResult({
      sortRun,
      snapshot
    });

    const trackCount = playlists.reduce((total, playlist) => total + playlist.tracks.length, 0);

    await input.store.createJobEvent({
      sortRunId: sortRun.id,
      stage: "preparing_review",
      level: "info",
      message: `Full organization generated ${playlists.length} playlists with ${trackCount} tracks.`,
      details: createPrivacySafeJobDetails({
        eventType: "full_sort_completed",
        durationMs: getWorkflowDurationMs(startedAt),
        counts: {
          recipeCount: recipes.length,
          libraryTrackCount: tracks.length,
          playlistCount: playlists.length,
          proposedTrackCount: trackCount
        }
      })
    });

    return {
      status: "completed",
      sortRunId: sortRun.id,
      playlistCount: playlists.length,
      trackCount
    };
  } catch (error) {
    const failure = createPrivacySafeFailure({
      workflowName: "Full organization",
      error
    });

    await input.store.markSortRunFailed({
      sortRunId: sortRun.id,
      userId: sortRun.userId,
      errorSummary: failure.message
    });
    await input.store.createJobEvent({
      sortRunId: sortRun.id,
      stage: "full_sort",
      level: "error",
      message: "Full organization failed.",
      details: createPrivacySafeJobDetails({
        eventType: "full_sort_failed",
        durationMs: getWorkflowDurationMs(startedAt),
        failureCategory: failure.category
      })
    });

    throw new Error(failure.message);
  }
}

type SortRunRow = {
  id: string;
  user_id: string;
  library_sync_id: string | null;
  state: SortRunState;
  payment_status: "pending" | "paid" | "failed" | "refunded";
};

type StoredPlaylistRow = {
  id: string;
  dimension: PlaylistDimension;
  title: string;
  description: string;
  confidence_label: GeneratedPlaylist["confidenceLabel"];
  playlist_rules: StoredFullSortPlaylist["playlistRules"];
  created_at: string;
};

type StoredPlaylistTrackRow = {
  normalized_track_id: string;
  position: number;
  score: number | null;
  reason: string | null;
  tracks_normalized:
    | {
        fingerprint: string;
        apple_song_id: string | null;
        name: string;
        artist_name: string;
        album_name: string | null;
      }
    | {
        fingerprint: string;
        apple_song_id: string | null;
        name: string;
        artist_name: string;
        album_name: string | null;
      }[]
    | null;
};

export function createSupabaseFullSortStore(supabase: SupabaseClient): FullSortStore {
  const previewStore = createSupabasePreviewSnapshotStore(supabase);
  const recipeStore = createSupabasePlaylistRecipeStore(supabase);

  return {
    async getPaidSortRunForFullSort(input) {
      const { data, error } = await supabase
        .from("sort_runs")
        .select("id,user_id,library_sync_id,state,payment_status")
        .eq("id", input.sortRunId)
        .eq("user_id", input.userId)
        .eq("state", "paid")
        .eq("payment_status", "paid")
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      const { count, error: countError } = await supabase
        .from("sort_playlists")
        .select("id", { count: "exact", head: true })
        .eq("sort_run_id", input.sortRunId);

      if (countError) {
        throw new Error(countError.message);
      }

      const row = data as SortRunRow;

      return {
        id: row.id,
        userId: row.user_id,
        librarySyncId: row.library_sync_id,
        state: "paid",
        paymentStatus: "paid",
        generatedPlaylistCount: count ?? 0
      };
    },
    listRecipesForSort: recipeStore.listRecipesForSort,
    listTracksForFullSort: previewStore.listTracksForPreview,
    listClassificationsForFullSort: previewStore.listClassificationsForPreview,

    async saveFullSortResult(input) {
      const { error: deleteError } = await supabase
        .from("sort_playlists")
        .delete()
        .eq("sort_run_id", input.sortRun.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      if (input.snapshot.playlists.length === 0) {
        return;
      }

      const generatedAt = input.snapshot.generatedAt;
      const { data: persistentPlaylistRows, error: persistentPlaylistError } = await supabase
        .from("playlists")
        .insert(
          input.snapshot.playlists.map((playlist) => ({
            user_id: input.sortRun.userId,
            source_provider: "apple_music",
            name: playlist.title,
            description: playlist.description,
            status: "active",
            created_from_sort_run_id: input.sortRun.id,
            latest_library_sync_id: input.sortRun.librarySyncId,
            last_generated_at: generatedAt
          }))
        )
        .select("id");

      if (persistentPlaylistError || !persistentPlaylistRows) {
        throw new Error(
          persistentPlaylistError?.message ?? "Unable to store generated app playlists."
        );
      }

      const { data: playlistRows, error: playlistError } = await supabase
        .from("sort_playlists")
        .insert(
          input.snapshot.playlists.map((playlist, index) => ({
            sort_run_id: input.sortRun.id,
            playlist_id: (persistentPlaylistRows[index] as { id: string } | undefined)?.id ?? null,
            dimension: playlist.dimension,
            title: playlist.title,
            description: playlist.description,
            confidence_label: playlist.confidenceLabel,
            playlist_rules: {
              generatedPlaylistId: playlist.id,
              qualityWarnings: playlist.qualityWarnings ?? [],
              matchStats: playlist.matchStats ?? null
            },
            selected: true
          }))
        )
        .select("id");

      if (playlistError || !playlistRows) {
        throw new Error(playlistError?.message ?? "Unable to store full-organization playlists.");
      }

      const { data: generationRows, error: generationError } = await supabase
        .from("playlist_generations")
        .insert(
          input.snapshot.playlists.map((playlist, index) => ({
            user_id: input.sortRun.userId,
            playlist_id: (persistentPlaylistRows[index] as { id: string }).id,
            recipe_id: playlist.id,
            sort_run_id: input.sortRun.id,
            library_sync_id: input.sortRun.librarySyncId,
            status: "ready_for_review",
            recipe_snapshot: {
              generatedPlaylistId: playlist.id,
              title: playlist.title,
              description: playlist.description,
              matchStats: playlist.matchStats ?? null,
              qualityWarnings: playlist.qualityWarnings ?? []
            },
            generated_at: generatedAt
          }))
        )
        .select("id");

      if (generationError || !generationRows) {
        throw new Error(generationError?.message ?? "Unable to store playlist generations.");
      }

      const playlistTrackRows = input.snapshot.playlists.flatMap((playlist, playlistIndex) => {
        const playlistRow = playlistRows[playlistIndex] as { id: string } | undefined;

        if (!playlistRow) {
          return [];
        }

        return playlist.tracks.flatMap((track) =>
          track.normalizedTrackId
            ? [
                {
                  sort_playlist_id: playlistRow.id,
                  normalized_track_id: track.normalizedTrackId,
                  position: track.position,
                  score: track.score,
                  reason: track.reason,
                  removed_by_user: false
                }
              ]
            : []
        );
      });

      if (playlistTrackRows.length > 0) {
        const { error: tracksError } = await supabase
          .from("sort_playlist_tracks")
          .insert(playlistTrackRows);

        if (tracksError) {
          throw new Error(tracksError.message);
        }
      }

      const generationTrackRows = input.snapshot.playlists.flatMap((playlist, playlistIndex) => {
        const generationRow = generationRows[playlistIndex] as { id: string } | undefined;

        if (!generationRow) {
          return [];
        }

        return playlist.tracks.flatMap((track) =>
          track.normalizedTrackId
            ? [
                {
                  generation_id: generationRow.id,
                  normalized_track_id: track.normalizedTrackId,
                  position: track.position,
                  score: track.score,
                  reason: track.reason,
                  decision: "keep"
                }
              ]
            : []
        );
      });

      if (generationTrackRows.length > 0) {
        const { error: generationTracksError } = await supabase
          .from("playlist_generation_tracks")
          .insert(generationTrackRows);

        if (generationTracksError) {
          throw new Error(generationTracksError.message);
        }
      }

      const recipeUpdateResults = await Promise.all(
        input.snapshot.playlists.map((playlist, index) =>
          supabase
            .from("playlist_recipes")
            .update({
              playlist_id: (persistentPlaylistRows[index] as { id: string }).id
            })
            .eq("id", playlist.id)
            .eq("sort_run_id", input.sortRun.id)
        )
      );

      const recipeUpdateError = recipeUpdateResults.find((result) => result.error)?.error;
      if (recipeUpdateError) {
        throw new Error(recipeUpdateError.message);
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
    },

    async markSortRunFailed(input) {
      const { error } = await supabase
        .from("sort_runs")
        .update({
          state: "failed",
          updated_at: new Date().toISOString()
        })
        .eq("id", input.sortRunId)
        .eq("user_id", input.userId);

      if (error) {
        throw new Error(error.message);
      }
    }
  };
}

export async function loadStoredFullSortReviewSnapshot(input: {
  supabase: SupabaseClient;
  sortRunId: string;
  librarySyncId: string | null;
}): Promise<PreviewSnapshot | null> {
  if (!input.librarySyncId) {
    return null;
  }

  const { data: playlistRows, error: playlistError } = await input.supabase
    .from("sort_playlists")
    .select("id,dimension,title,description,confidence_label,playlist_rules,created_at")
    .eq("sort_run_id", input.sortRunId)
    .order("created_at", { ascending: true });

  if (playlistError || !playlistRows || playlistRows.length === 0) {
    if (playlistError) {
      throw new Error(playlistError.message);
    }

    return null;
  }

  const playlists = await Promise.all(
    (playlistRows as StoredPlaylistRow[]).map(async (playlist) => {
      const { data: trackRows, error: trackError } = await input.supabase
        .from("sort_playlist_tracks")
        .select(
          "normalized_track_id,position,score,reason,tracks_normalized(fingerprint,apple_song_id,name,artist_name,album_name)"
        )
        .eq("sort_playlist_id", playlist.id)
        .order("position", { ascending: true });

      if (trackError || !trackRows) {
        throw new Error(trackError?.message ?? "Unable to load full-organization tracks.");
      }

      return {
        id: playlist.id,
        dimension: playlist.dimension,
        title: playlist.title,
        description: playlist.description,
        confidenceLabel: playlist.confidence_label,
        playlistRules: playlist.playlist_rules,
        tracks: (trackRows as StoredPlaylistTrackRow[]).map(mapStoredTrackRow)
      };
    })
  );

  return createReviewSnapshotFromStoredPlaylists({
    sortRunId: input.sortRunId,
    librarySyncId: input.librarySyncId,
    generatedAt: new Date().toISOString(),
    playlists
  });
}

export function createReviewSnapshotFromStoredPlaylists(input: {
  sortRunId: string;
  librarySyncId: string;
  generatedAt: string;
  playlists: StoredFullSortPlaylist[];
}): PreviewSnapshot {
  return {
    sortRunId: input.sortRunId,
    librarySyncId: input.librarySyncId,
    generatedAt: input.generatedAt,
    playlists: input.playlists.map((playlist) => {
      const tracks = playlist.tracks.slice().sort((left, right) => left.position - right.position);

      return {
        id: playlist.playlistRules?.generatedPlaylistId ?? playlist.id,
        dimension: playlist.dimension,
        title: playlist.title,
        description: playlist.description,
        confidenceLabel: playlist.confidenceLabel,
        trackCount: tracks.length,
        trackFingerprints: tracks.map((track) => track.fingerprint),
        appleSongIds: tracks.flatMap((track) => (track.appleSongId ? [track.appleSongId] : [])),
        tracks,
        ...(playlist.playlistRules?.qualityWarnings?.length
          ? { qualityWarnings: playlist.playlistRules.qualityWarnings }
          : {}),
        ...(playlist.playlistRules?.matchStats ? { matchStats: playlist.playlistRules.matchStats } : {})
      };
    })
  };
}

function mapStoredTrackRow(row: StoredPlaylistTrackRow): StoredFullSortTrack {
  const normalizedTrack = Array.isArray(row.tracks_normalized)
    ? row.tracks_normalized[0]
    : row.tracks_normalized;

  return {
    fingerprint: normalizedTrack?.fingerprint ?? row.normalized_track_id,
    normalizedTrackId: row.normalized_track_id,
    ...(normalizedTrack?.apple_song_id ? { appleSongId: normalizedTrack.apple_song_id } : {}),
    ...(normalizedTrack?.name ? { name: normalizedTrack.name } : {}),
    ...(normalizedTrack?.artist_name ? { artistName: normalizedTrack.artist_name } : {}),
    ...(normalizedTrack?.album_name ? { albumName: normalizedTrack.album_name } : {}),
    position: row.position,
    score: row.score === null ? 0 : Number(row.score),
    reason: row.reason ?? "Matched this Playlist Recipe."
  };
}
