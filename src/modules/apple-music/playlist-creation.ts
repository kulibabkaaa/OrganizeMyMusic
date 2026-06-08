import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppleApiCredentials } from "@/modules/apple-music/types";
import type { AppleMusicTrackReference } from "@/modules/apple-music/client";
import { AppleMusicClient } from "@/modules/apple-music/client";
import { decryptAppleMusicUserToken } from "@/modules/apple-music/auth";
import { createAppleDeveloperToken } from "@/modules/apple-music/developer-token";
import type {
  AppleMusicConnectionSummary
} from "@/modules/library-syncs/queue";
import type { PlaylistCreationJobData } from "@/modules/sorts/playlist-creation-queue";

export interface ConfirmedSortRunForPlaylistCreation {
  id: string;
  userId: string;
  state: "creating_playlists";
}

export interface SelectedPlaylistForCreation {
  id: string;
  playlistId?: string | null;
  title: string;
  description: string;
  applePlaylistId: string | null;
  tracks: SelectedPlaylistTrackForInsertion[];
}

export interface SelectedPlaylistTrackForInsertion {
  normalizedTrackId: string;
  appleSongId: string | null;
  position: number;
}

export interface PlaylistCreationStore {
  getConfirmedSortRun(input: {
    sortRunId: string;
    userId: string;
  }): Promise<ConfirmedSortRunForPlaylistCreation | null>;
  getConnectedAppleMusicConnection(userId: string): Promise<AppleMusicConnectionSummary | null>;
  listSelectedPlaylists(sortRunId: string): Promise<SelectedPlaylistForCreation[]>;
  setApplePlaylistId(input: {
    sortRunId: string;
    sortPlaylistId: string;
    applePlaylistId: string;
  }): Promise<void>;
  markPlaylistTracksExported(input: {
    sortRunId: string;
    sortPlaylistId: string;
    applePlaylistId: string;
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
  markSortRunCompleted(input: {
    sortRunId: string;
    userId: string;
  }): Promise<void>;
}

export interface PlaylistCreationResult {
  createdCount: number;
  skippedCount: number;
  playlistTrackCount: number;
  trackBatchCount: number;
  failedCount: number;
}

type SortRunRow = {
  id: string;
  user_id: string;
  state: "creating_playlists";
};

type AppleMusicConnectionRow = {
  id: string;
  status: "connected" | "expired" | "revoked" | "error";
  storefront: string;
  encrypted_user_token?: string;
};

type SortPlaylistRow = {
  id: string;
  playlist_id: string | null;
  title: string;
  description: string;
  apple_playlist_id: string | null;
};

type SortPlaylistTrackRow = {
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

const APPLE_PLAYLIST_TRACK_BATCH_SIZE = 100;

export async function handlePlaylistCreationJob(input: {
  store: PlaylistCreationStore;
  data: PlaylistCreationJobData;
  createDeveloperToken?: typeof createAppleDeveloperToken;
  decryptUserToken?: typeof decryptAppleMusicUserToken;
  createLibraryPlaylist?: (
    credentials: AppleApiCredentials,
    playlist: SelectedPlaylistForCreation
  ) => Promise<{ id: string }>;
  addTracksToPlaylist?: (
    credentials: AppleApiCredentials,
    playlistId: string,
    tracks: AppleMusicTrackReference[]
  ) => Promise<void>;
  trackBatchSize?: number;
}): Promise<PlaylistCreationResult> {
  const sortRun = await input.store.getConfirmedSortRun({
    sortRunId: input.data.sortRunId,
    userId: input.data.userId
  });

  if (!sortRun) {
    throw new Error("Confirmed sort run is not ready for playlist creation.");
  }

  let failureRecorded = false;

  try {
    const connection = await input.store.getConnectedAppleMusicConnection(sortRun.userId);

    if (!connection?.encryptedUserToken) {
      throw new Error("Connected Apple Music token is unavailable.");
    }

    const developerToken = await (input.createDeveloperToken ?? createAppleDeveloperToken)();
    const musicUserToken = (input.decryptUserToken ?? decryptAppleMusicUserToken)(
      connection.encryptedUserToken
    );
    const credentials: AppleApiCredentials = {
      developerToken: developerToken.developerToken,
      musicUserToken,
      storefront: connection.storefront
    };
    const playlists = await input.store.listSelectedPlaylists(sortRun.id);

    if (playlists.length === 0) {
      throw new Error("No selected playlists are available for Apple Music creation.");
    }

    await input.store.createJobEvent({
      sortRunId: sortRun.id,
      stage: "playlist_creation",
      level: "info",
      message: `Creating ${playlists.length} Apple Music playlists.`
    });

    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let playlistTrackCount = 0;
    let trackBatchCount = 0;
    const trackBatchSize = input.trackBatchSize ?? APPLE_PLAYLIST_TRACK_BATCH_SIZE;

    for (const playlist of playlists) {
      let applePlaylistId = playlist.applePlaylistId;

      if (playlist.applePlaylistId) {
        skippedCount += 1;
        await input.store.createJobEvent({
          sortRunId: sortRun.id,
          stage: "playlist_creation",
          level: "info",
          message: `Skipped "${playlist.title}" because it already has an Apple playlist ID.`,
          details: {
            sortPlaylistId: playlist.id,
            applePlaylistId: playlist.applePlaylistId
          }
        });
      } else {
        try {
          const created = await (input.createLibraryPlaylist ?? createAppleMusicPlaylistShell)(
            credentials,
            playlist
          );

          applePlaylistId = created.id;
          await input.store.setApplePlaylistId({
            sortRunId: sortRun.id,
            sortPlaylistId: playlist.id,
            applePlaylistId: created.id
          });
          createdCount += 1;
          await input.store.createJobEvent({
            sortRunId: sortRun.id,
            stage: "playlist_creation",
            level: "info",
            message: `Created Apple Music playlist "${playlist.title}".`,
            details: {
              sortPlaylistId: playlist.id,
              applePlaylistId: created.id
            }
          });
        } catch (error) {
          failedCount += 1;
          await input.store.createJobEvent({
            sortRunId: sortRun.id,
            stage: "playlist_creation",
            level: "error",
            message:
              error instanceof Error
                ? `Failed to create "${playlist.title}": ${error.message}`
                : `Failed to create "${playlist.title}".`,
            details: {
              sortPlaylistId: playlist.id
            }
          });
          continue;
        }
      }

      if (!applePlaylistId) {
        failedCount += 1;
        await input.store.createJobEvent({
          sortRunId: sortRun.id,
          stage: "playlist_creation",
          level: "error",
          message: `Apple Music playlist ID is unavailable for "${playlist.title}".`,
          details: {
            sortPlaylistId: playlist.id
          }
        });
        continue;
      }

      const addableTracks = playlist.tracks
        .filter((track) => track.appleSongId)
        .sort((left, right) => left.position - right.position)
        .map((track): AppleMusicTrackReference => ({
          id: track.appleSongId ?? "",
          type: "library-songs"
        }));
      const missingAppleSongIdCount = playlist.tracks.length - addableTracks.length;

      if (missingAppleSongIdCount > 0) {
        await input.store.createJobEvent({
          sortRunId: sortRun.id,
          stage: "playlist_creation",
          level: "warn",
          message: `Skipped ${missingAppleSongIdCount} tracks in "${playlist.title}" because they do not have Apple library song IDs.`,
          details: {
            sortPlaylistId: playlist.id,
            applePlaylistId
          }
        });
      }

      if (addableTracks.length === 0) {
        await input.store.markPlaylistTracksExported({
          sortRunId: sortRun.id,
          sortPlaylistId: playlist.id,
          applePlaylistId
        });
        continue;
      }

      try {
        const batches = chunk(addableTracks, trackBatchSize);

        for (const batch of batches) {
          await (input.addTracksToPlaylist ?? addTracksToAppleMusicPlaylist)(
            credentials,
            applePlaylistId,
            batch
          );
          trackBatchCount += 1;
        }

        playlistTrackCount += addableTracks.length;
        await input.store.markPlaylistTracksExported({
          sortRunId: sortRun.id,
          sortPlaylistId: playlist.id,
          applePlaylistId
        });
        await input.store.createJobEvent({
          sortRunId: sortRun.id,
          stage: "playlist_creation",
          level: "info",
          message: `Added ${addableTracks.length} tracks to "${playlist.title}".`,
          details: {
            sortPlaylistId: playlist.id,
            applePlaylistId,
            batchCount: batches.length
          }
        });
      } catch (error) {
        failedCount += 1;
        await input.store.createJobEvent({
          sortRunId: sortRun.id,
          stage: "playlist_creation",
          level: "error",
          message:
            error instanceof Error
              ? `Failed to add tracks to "${playlist.title}": ${error.message}`
              : `Failed to add tracks to "${playlist.title}".`,
          details: {
            sortPlaylistId: playlist.id,
            applePlaylistId
          }
        });
      }
    }

    if (failedCount > 0) {
      const errorSummary = `Failed to write back ${failedCount} Apple Music playlists.`;

      await input.store.markSortRunFailed({
        sortRunId: sortRun.id,
        userId: sortRun.userId,
        errorSummary
      });
      failureRecorded = true;
      throw new Error(errorSummary);
    }

    await input.store.createJobEvent({
      sortRunId: sortRun.id,
      stage: "playlist_creation",
      level: "info",
      message: `Apple Music write-back finished: ${createdCount} playlists created, ${skippedCount} already existed, ${playlistTrackCount} tracks added.`
    });
    await input.store.markSortRunCompleted({
      sortRunId: sortRun.id,
      userId: sortRun.userId
    });

    return {
      createdCount,
      skippedCount,
      playlistTrackCount,
      trackBatchCount,
      failedCount
    };
  } catch (error) {
    const errorSummary = error instanceof Error ? error.message : "Playlist creation failed.";

    if (!failureRecorded) {
      await input.store.markSortRunFailed({
        sortRunId: sortRun.id,
        userId: sortRun.userId,
        errorSummary
      });
      await input.store.createJobEvent({
        sortRunId: sortRun.id,
        stage: "playlist_creation",
        level: "error",
        message: errorSummary
      });
    }

    throw error;
  }
}

async function createAppleMusicPlaylistShell(
  credentials: AppleApiCredentials,
  playlist: SelectedPlaylistForCreation
) {
  return new AppleMusicClient(credentials).createLibraryPlaylist({
    name: playlist.title,
    description: playlist.description
  });
}

async function addTracksToAppleMusicPlaylist(
  credentials: AppleApiCredentials,
  playlistId: string,
  tracks: AppleMusicTrackReference[]
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

export function createSupabasePlaylistCreationStore(
  supabase: SupabaseClient
): PlaylistCreationStore {
  return {
    async getConfirmedSortRun(input) {
      const { data, error } = await supabase
        .from("sort_runs")
        .select("id,user_id,state")
        .eq("id", input.sortRunId)
        .eq("user_id", input.userId)
        .eq("state", "creating_playlists")
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      const row = data as SortRunRow;

      return {
        id: row.id,
        userId: row.user_id,
        state: row.state
      };
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

    async listSelectedPlaylists(sortRunId) {
      const { data, error } = await supabase
        .from("sort_playlists")
        .select("id,playlist_id,title,description,apple_playlist_id")
        .eq("sort_run_id", sortRunId)
        .eq("selected", true)
        .order("created_at", { ascending: true });

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to load selected playlists.");
      }

      return Promise.all(
        (data as SortPlaylistRow[]).map(async (playlist) => {
          const { data: trackRows, error: trackError } = await supabase
            .from("sort_playlist_tracks")
            .select("normalized_track_id,position,tracks_normalized(apple_song_id)")
            .eq("sort_playlist_id", playlist.id)
            .eq("removed_by_user", false)
            .order("position", { ascending: true });

          if (trackError || !trackRows) {
            throw new Error(trackError?.message ?? "Unable to load playlist tracks.");
          }

          return {
            id: playlist.id,
            playlistId: playlist.playlist_id,
            title: playlist.title,
            description: playlist.description,
            applePlaylistId: playlist.apple_playlist_id,
            tracks: (trackRows as SortPlaylistTrackRow[]).map((track) => {
              const normalizedTrack = Array.isArray(track.tracks_normalized)
                ? track.tracks_normalized[0]
                : track.tracks_normalized;

              return {
                normalizedTrackId: track.normalized_track_id,
                appleSongId: normalizedTrack?.apple_song_id ?? null,
                position: track.position
              };
            })
          };
        })
      );
    },

    async setApplePlaylistId(input) {
      const { data: playlistRow, error: playlistLoadError } = await supabase
        .from("sort_playlists")
        .select("playlist_id")
        .eq("id", input.sortPlaylistId)
        .eq("sort_run_id", input.sortRunId)
        .maybeSingle();

      if (playlistLoadError) {
        throw new Error(playlistLoadError.message);
      }

      const { error } = await supabase
        .from("sort_playlists")
        .update({
          apple_playlist_id: input.applePlaylistId
        })
        .eq("id", input.sortPlaylistId)
        .eq("sort_run_id", input.sortRunId);

      if (error) {
        throw new Error(error.message);
      }

      const playlistId = (playlistRow as { playlist_id: string | null } | null)?.playlist_id;

      if (!playlistId) {
        return;
      }

      const now = new Date().toISOString();
      const { error: playlistError } = await supabase
        .from("playlists")
        .update({
          apple_playlist_id: input.applePlaylistId,
          updated_at: now
        })
        .eq("id", playlistId);

      if (playlistError) {
        throw new Error(playlistError.message);
      }

      const { error: generationError } = await supabase
        .from("playlist_generations")
        .update({
          updated_at: now
        })
        .eq("playlist_id", playlistId)
        .eq("sort_run_id", input.sortRunId);

      if (generationError) {
        throw new Error(generationError.message);
      }

      const { error: exportError } = await supabase
        .from("playlist_exports")
        .update({
          apple_playlist_id: input.applePlaylistId,
          updated_at: now
        })
        .eq("playlist_id", playlistId)
        .eq("sort_run_id", input.sortRunId);

      if (exportError) {
        throw new Error(exportError.message);
      }
    },

    async markPlaylistTracksExported(input) {
      const { data: playlistRow, error: playlistLoadError } = await supabase
        .from("sort_playlists")
        .select("playlist_id")
        .eq("id", input.sortPlaylistId)
        .eq("sort_run_id", input.sortRunId)
        .maybeSingle();

      if (playlistLoadError) {
        throw new Error(playlistLoadError.message);
      }

      const playlistId = (playlistRow as { playlist_id: string | null } | null)?.playlist_id;

      if (!playlistId) {
        return;
      }

      const now = new Date().toISOString();
      const [playlistResult, generationResult, exportResult] = await Promise.all([
        supabase
          .from("playlists")
          .update({
            apple_playlist_id: input.applePlaylistId,
            last_exported_at: now,
            updated_at: now
          })
          .eq("id", playlistId),
        supabase
          .from("playlist_generations")
          .update({
            status: "exported",
            updated_at: now
          })
          .eq("playlist_id", playlistId)
          .eq("sort_run_id", input.sortRunId),
        supabase
          .from("playlist_exports")
          .update({
            apple_playlist_id: input.applePlaylistId,
            status: "exported",
            updated_at: now
          })
          .eq("playlist_id", playlistId)
          .eq("sort_run_id", input.sortRunId)
      ]);
      const error = playlistResult.error ?? generationResult.error ?? exportResult.error;

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
    },

    async markSortRunFailed(input) {
      const now = new Date().toISOString();
      const [sortRunResult, generationResult, exportResult] = await Promise.all([
        supabase
          .from("sort_runs")
          .update({
            state: "failed",
            updated_at: now
          })
          .eq("id", input.sortRunId)
          .eq("user_id", input.userId),
        supabase
          .from("playlist_generations")
          .update({
            status: "failed",
            error_summary: input.errorSummary,
            updated_at: now
          })
          .eq("sort_run_id", input.sortRunId)
          .neq("status", "exported"),
        supabase
          .from("playlist_exports")
          .update({
            status: "failed",
            error_summary: input.errorSummary,
            updated_at: now
          })
          .eq("sort_run_id", input.sortRunId)
          .neq("status", "exported")
      ]);
      const error = sortRunResult.error ?? generationResult.error ?? exportResult.error;

      if (error) {
        throw new Error(error.message);
      }
    },

    async markSortRunCompleted(input) {
      const { error } = await supabase
        .from("sort_runs")
        .update({
          state: "completed",
          updated_at: new Date().toISOString()
        })
        .eq("id", input.sortRunId)
        .eq("user_id", input.userId)
        .eq("state", "creating_playlists");

      if (error) {
        throw new Error(error.message);
      }
    }
  };
}
