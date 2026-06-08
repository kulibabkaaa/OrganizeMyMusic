import type { SupabaseClient } from "@supabase/supabase-js";

import { createPrivacySafeFailure } from "@/modules/activity/privacy-safe-observability";
import { decryptAppleMusicUserToken } from "@/modules/apple-music/auth";
import { AppleMusicClient } from "@/modules/apple-music/client";
import { createAppleDeveloperToken } from "@/modules/apple-music/developer-token";
import type { AppleApiCredentials } from "@/modules/apple-music/types";
import type { AppleMusicConnectionSummary } from "@/modules/library-syncs/queue";

type PlaylistRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  apple_playlist_id: string | null;
};

type GenerationRow = {
  id: string;
  user_id: string;
  playlist_id: string;
  status: "ready_for_review" | "reviewed" | "exporting" | "exported" | "failed";
};

type AppleMusicConnectionRow = {
  id: string;
  status: "connected" | "expired" | "revoked" | "error";
  storefront: string;
  encrypted_user_token?: string;
};

type GenerationTrackRow = {
  normalized_track_id: string;
  position: number;
  tracks_normalized:
    | {
        apple_song_id: string | null;
      }
    | {
        apple_song_id: string | null;
      }[]
    | null;
};

export type PlaylistGenerationExportResult =
  | {
      status: "exported";
      playlistId: string;
      generationId: string;
      applePlaylistId: string;
      selectedTrackCount: number;
    }
  | {
      status:
        | "playlist_not_found"
        | "playlist_archived"
        | "generation_not_found"
        | "invalid_state"
        | "empty_selection"
        | "apple_music_not_connected";
      message: string;
    };

export const PLAYLIST_GENERATION_EXPORT_JOB_NAME = "playlist-generation-export";

export interface PlaylistGenerationExportJobData {
  userId: string;
  playlistId: string;
  generationId: string;
  exportId: string;
}

export interface PlaylistGenerationExportQueue {
  createQueue?(name: typeof PLAYLIST_GENERATION_EXPORT_JOB_NAME): Promise<void>;
  send(
    name: typeof PLAYLIST_GENERATION_EXPORT_JOB_NAME,
    data: PlaylistGenerationExportJobData,
    options: {
      retryLimit: number;
      retryDelay: number;
      retryBackoff: boolean;
      singletonKey: string;
    }
  ): Promise<string | null>;
}

export type QueuePlaylistGenerationExportResult =
  | {
      status: "queued";
      playlistId: string;
      generationId: string;
      exportId: string;
      selectedTrackCount: number;
      jobId: string | null;
    }
  | {
      status: "queue_failed";
      playlistId: string;
      generationId: string;
      exportId: string;
      selectedTrackCount: number;
      message: string;
    }
  | Exclude<PlaylistGenerationExportResult, { status: "exported" }>;

export interface PlaylistGenerationExportStore {
  getPlaylist(input: { userId: string; playlistId: string }): Promise<PlaylistRow | null>;
  getGeneration(input: {
    userId: string;
    playlistId: string;
    generationId: string;
  }): Promise<GenerationRow | null>;
  getConnectedAppleMusicConnection(userId: string): Promise<AppleMusicConnectionSummary | null>;
  listKeptTracks(generationId: string): Promise<Array<{ appleSongId: string | null; position: number }>>;
  createExportRow(input: {
    userId: string;
    playlistId: string;
    generationId: string;
    selectedTrackCount: number;
  }): Promise<string>;
  markExporting(input: { generationId: string; exportId: string }): Promise<void>;
  markApplePlaylistCreated(input: {
    playlistId: string;
    exportId: string;
    applePlaylistId: string;
  }): Promise<void>;
  markExported(input: {
    playlistId: string;
    generationId: string;
    exportId: string;
    applePlaylistId: string;
  }): Promise<void>;
  markFailed(input: {
    generationId: string;
    exportId: string;
    errorSummary: string;
  }): Promise<void>;
}

const APPLE_PLAYLIST_TRACK_BATCH_SIZE = 100;

export async function queuePlaylistGenerationExport(input: {
  store: PlaylistGenerationExportStore;
  queue: PlaylistGenerationExportQueue;
  userId: string;
  playlistId: string;
  generationId: string;
}): Promise<QueuePlaylistGenerationExportResult> {
  await input.queue.createQueue?.(PLAYLIST_GENERATION_EXPORT_JOB_NAME);

  const validation = await validatePlaylistGenerationExport(input);

  if (validation.status !== "ready") {
    return validation;
  }

  const exportId = await input.store.createExportRow({
    userId: input.userId,
    playlistId: validation.playlist.id,
    generationId: validation.generation.id,
    selectedTrackCount: validation.selectedTrackCount
  });
  await input.store.markExporting({
    generationId: validation.generation.id,
    exportId
  });

  let jobId: string | null;

  try {
    jobId = await input.queue.send(
      PLAYLIST_GENERATION_EXPORT_JOB_NAME,
      {
        userId: input.userId,
        playlistId: validation.playlist.id,
        generationId: validation.generation.id,
        exportId
      },
      {
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
        singletonKey: validation.generation.id
      }
    );
  } catch (error) {
    const failure = createPrivacySafeFailure({
      workflowName: "Playlist generation export queue",
      error
    });
    await input.store.markFailed({
      generationId: validation.generation.id,
      exportId,
      errorSummary: failure.message
    });

    return {
      status: "queue_failed",
      playlistId: validation.playlist.id,
      generationId: validation.generation.id,
      exportId,
      selectedTrackCount: validation.selectedTrackCount,
      message: failure.message
    };
  }

  return {
    status: "queued",
    playlistId: validation.playlist.id,
    generationId: validation.generation.id,
    exportId,
    selectedTrackCount: validation.selectedTrackCount,
    jobId
  };
}

export async function exportPlaylistGenerationToAppleMusic(input: {
  store: PlaylistGenerationExportStore;
  userId: string;
  playlistId: string;
  generationId: string;
  exportId?: string;
  createDeveloperToken?: typeof createAppleDeveloperToken;
  decryptUserToken?: typeof decryptAppleMusicUserToken;
  createLibraryPlaylist?: (
    credentials: AppleApiCredentials,
    playlist: { name: string; description: string | null }
  ) => Promise<{ id: string }>;
  addTracksToPlaylist?: (
    credentials: AppleApiCredentials,
    playlistId: string,
    tracks: Array<{ id: string; type: "library-songs" }>
  ) => Promise<void>;
  trackBatchSize?: number;
}): Promise<PlaylistGenerationExportResult> {
  const validation = await validatePlaylistGenerationExport({
    store: input.store,
    userId: input.userId,
    playlistId: input.playlistId,
    generationId: input.generationId,
    allowExportingStatus: Boolean(input.exportId)
  });

  if (validation.status !== "ready") {
    return validation;
  }

  const { playlist, generation, keptTracks } = validation;
  const addableTracks = keptTracks
    .filter((track) => track.appleSongId)
    .sort((left, right) => left.position - right.position)
    .map((track) => ({
      id: track.appleSongId ?? "",
      type: "library-songs" as const
    }));
  const exportId =
    input.exportId ??
    (await input.store.createExportRow({
      userId: input.userId,
      playlistId: playlist.id,
      generationId: generation.id,
      selectedTrackCount: addableTracks.length
    }));

  if (!input.exportId) {
    await input.store.markExporting({
      generationId: generation.id,
      exportId
    });
  }

  try {
    const developerToken = await (input.createDeveloperToken ?? createAppleDeveloperToken)();
    const musicUserToken = (input.decryptUserToken ?? decryptAppleMusicUserToken)(
      validation.connection.encryptedUserToken ?? ""
    );
    const credentials = {
      developerToken: developerToken.developerToken,
      musicUserToken,
      storefront: validation.connection.storefront
    };
    let applePlaylistId = playlist.apple_playlist_id;

    if (!applePlaylistId) {
      const created = await (input.createLibraryPlaylist ?? createAppleMusicPlaylistShell)(
        credentials,
        {
          name: playlist.name,
          description: playlist.description
        }
      );

      applePlaylistId = created.id;
      await input.store.markApplePlaylistCreated({
        playlistId: playlist.id,
        exportId,
        applePlaylistId
      });
    }

    const batches = chunk(addableTracks, input.trackBatchSize ?? APPLE_PLAYLIST_TRACK_BATCH_SIZE);

    for (const batch of batches) {
      await (input.addTracksToPlaylist ?? addTracksToAppleMusicPlaylist)(
        credentials,
        applePlaylistId,
        batch
      );
    }

    await input.store.markExported({
      playlistId: playlist.id,
      generationId: generation.id,
      exportId,
      applePlaylistId
    });

    return {
      status: "exported",
      playlistId: playlist.id,
      generationId: generation.id,
      applePlaylistId,
      selectedTrackCount: addableTracks.length
    };
  } catch (error) {
    const failure = createPrivacySafeFailure({
      workflowName: "Playlist generation export",
      error
    });
    await input.store.markFailed({
      generationId: generation.id,
      exportId,
      errorSummary: failure.message
    });
    throw error;
  }
}

async function validatePlaylistGenerationExport(input: {
  store: PlaylistGenerationExportStore;
  userId: string;
  playlistId: string;
  generationId: string;
  allowExportingStatus?: boolean;
}): Promise<
  | {
      status: "ready";
      playlist: PlaylistRow;
      generation: GenerationRow;
      connection: AppleMusicConnectionSummary;
      keptTracks: Array<{ appleSongId: string | null; position: number }>;
      selectedTrackCount: number;
    }
  | Exclude<PlaylistGenerationExportResult, { status: "exported" }>
> {
  const playlist = await input.store.getPlaylist({
    userId: input.userId,
    playlistId: input.playlistId
  });

  if (!playlist) {
    return {
      status: "playlist_not_found",
      message: "Playlist not found."
    };
  }

  if (playlist.status === "archived") {
    return {
      status: "playlist_archived",
      message: "Archived playlists cannot be exported."
    };
  }

  const generation = await input.store.getGeneration({
    userId: input.userId,
    playlistId: input.playlistId,
    generationId: input.generationId
  });

  if (!generation) {
    return {
      status: "generation_not_found",
      message: "Playlist generation not found."
    };
  }

  const allowedStatuses = input.allowExportingStatus
    ? ["reviewed", "exporting", "failed"]
    : ["reviewed", "failed"];

  if (!allowedStatuses.includes(generation.status)) {
    return {
      status: "invalid_state",
      message: "Review the generated playlist before export."
    };
  }

  const keptTracks = await input.store.listKeptTracks(generation.id);
  const selectedTrackCount = keptTracks.filter((track) => track.appleSongId).length;

  if (selectedTrackCount === 0) {
    return {
      status: "empty_selection",
      message: "Keep at least one Apple Music library track before export."
    };
  }

  const connection = await input.store.getConnectedAppleMusicConnection(input.userId);

  if (!connection?.encryptedUserToken) {
    return {
      status: "apple_music_not_connected",
      message: "Connect Apple Music before export."
    };
  }

  return {
    status: "ready",
    playlist,
    generation,
    connection,
    keptTracks,
    selectedTrackCount
  };
}

export function createSupabasePlaylistGenerationExportStore(
  supabase: SupabaseClient
): PlaylistGenerationExportStore {
  return {
    async getPlaylist(input) {
      const { data, error } = await supabase
        .from("playlists")
        .select("id,user_id,name,description,status,apple_playlist_id")
        .eq("id", input.playlistId)
        .eq("user_id", input.userId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data ? (data as PlaylistRow) : null;
    },

    async getGeneration(input) {
      const { data, error } = await supabase
        .from("playlist_generations")
        .select("id,user_id,playlist_id,status")
        .eq("id", input.generationId)
        .eq("playlist_id", input.playlistId)
        .eq("user_id", input.userId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data ? (data as GenerationRow) : null;
    },

    async getConnectedAppleMusicConnection(userId) {
      const { data, error } = await supabase
        .from("apple_music_connections")
        .select("id,status,storefront,encrypted_user_token")
        .eq("user_id", userId)
        .eq("status", "connected")
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      const row = data as AppleMusicConnectionRow;

      return {
        id: row.id,
        status: row.status,
        storefront: row.storefront,
        encryptedUserToken: row.encrypted_user_token
      };
    },

    async listKeptTracks(generationId) {
      const { data, error } = await supabase
        .from("playlist_generation_tracks")
        .select("normalized_track_id,position,tracks_normalized(apple_song_id)")
        .eq("generation_id", generationId)
        .eq("decision", "keep")
        .order("position", { ascending: true });

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to load approved playlist tracks.");
      }

      return (data as GenerationTrackRow[]).map((track) => {
        const normalizedTrack = Array.isArray(track.tracks_normalized)
          ? track.tracks_normalized[0]
          : track.tracks_normalized;

        return {
          appleSongId: normalizedTrack?.apple_song_id ?? null,
          position: track.position
        };
      });
    },

    async createExportRow(input) {
      const { data, error } = await supabase
        .from("playlist_exports")
        .insert({
          user_id: input.userId,
          playlist_id: input.playlistId,
          generation_id: input.generationId,
          sort_run_id: null,
          status: "queued",
          selected_track_count: input.selectedTrackCount
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to store playlist export.");
      }

      return (data as { id: string }).id;
    },

    async markExporting(input) {
      const now = new Date().toISOString();
      const [generationResult, exportResult] = await Promise.all([
        supabase
          .from("playlist_generations")
          .update({ status: "exporting", updated_at: now })
          .eq("id", input.generationId),
        supabase
          .from("playlist_exports")
          .update({ status: "exporting", updated_at: now })
          .eq("id", input.exportId)
      ]);
      const error = generationResult.error ?? exportResult.error;

      if (error) {
        throw new Error(error.message);
      }
    },

    async markApplePlaylistCreated(input) {
      const now = new Date().toISOString();
      const [playlistResult, exportResult] = await Promise.all([
        supabase
          .from("playlists")
          .update({
            apple_playlist_id: input.applePlaylistId,
            updated_at: now
          })
          .eq("id", input.playlistId),
        supabase
          .from("playlist_exports")
          .update({
            apple_playlist_id: input.applePlaylistId,
            updated_at: now
          })
          .eq("id", input.exportId)
      ]);
      const error = playlistResult.error ?? exportResult.error;

      if (error) {
        throw new Error(error.message);
      }
    },

    async markExported(input) {
      const now = new Date().toISOString();
      const [playlistResult, generationResult, exportResult] = await Promise.all([
        supabase
          .from("playlists")
          .update({
            apple_playlist_id: input.applePlaylistId,
            last_exported_at: now,
            updated_at: now
          })
          .eq("id", input.playlistId),
        supabase
          .from("playlist_generations")
          .update({ status: "exported", updated_at: now })
          .eq("id", input.generationId),
        supabase
          .from("playlist_exports")
          .update({
            apple_playlist_id: input.applePlaylistId,
            status: "exported",
            updated_at: now
          })
          .eq("id", input.exportId)
      ]);
      const error = playlistResult.error ?? generationResult.error ?? exportResult.error;

      if (error) {
        throw new Error(error.message);
      }
    },

    async markFailed(input) {
      const now = new Date().toISOString();
      const [generationResult, exportResult] = await Promise.all([
        supabase
          .from("playlist_generations")
          .update({
            status: "failed",
            error_summary: input.errorSummary,
            updated_at: now
          })
          .eq("id", input.generationId),
        supabase
          .from("playlist_exports")
          .update({
            status: "failed",
            error_summary: input.errorSummary,
            updated_at: now
          })
          .eq("id", input.exportId)
      ]);
      const error = generationResult.error ?? exportResult.error;

      if (error) {
        throw new Error(error.message);
      }
    }
  };
}

async function createAppleMusicPlaylistShell(
  credentials: AppleApiCredentials,
  playlist: { name: string; description: string | null }
) {
  return new AppleMusicClient(credentials).createLibraryPlaylist({
    name: playlist.name,
    description: playlist.description ?? undefined
  });
}

async function addTracksToAppleMusicPlaylist(
  credentials: AppleApiCredentials,
  playlistId: string,
  tracks: Array<{ id: string; type: "library-songs" }>
) {
  return new AppleMusicClient(credentials).addTracksToLibraryPlaylist({
    playlistId,
    tracks
  });
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}
