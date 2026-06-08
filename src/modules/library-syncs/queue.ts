import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AppleMusicClient,
  type AppleLibrarySongResource
} from "@/modules/apple-music/client";
import { decryptAppleMusicUserToken } from "@/modules/apple-music/auth";
import { createAppleDeveloperToken } from "@/modules/apple-music/developer-token";
import { classifyTracks } from "@/modules/classification/batch-classify";
import { dedupeTracks } from "@/modules/library/dedupe";
import { normalizeTrack } from "@/modules/library/normalize";
import type { NormalizedTrack, RawAppleTrack, TrackClassification } from "@/types/domain";

export const LIBRARY_SYNC_JOB_NAME = "library-sync";

export type LibrarySyncStatus = "queued" | "syncing" | "normalizing" | "completed" | "failed";

export interface LibrarySyncSummary {
  id: string;
  userId: string;
  status: LibrarySyncStatus;
  rawTrackCount: number;
  normalizedTrackCount: number;
  duplicateCount: number;
  errorSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LibrarySyncJobEvent {
  id: string;
  librarySyncId: string;
  stage: string;
  level: "info" | "warn" | "error";
  message: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface AppleMusicConnectionSummary {
  id: string;
  status: "connected" | "expired" | "revoked" | "error";
  storefront: string;
  encryptedUserToken?: string;
}

export interface RawAppleMusicTrackInput {
  appleSongId: string;
  payload: AppleLibrarySongResource;
}

export interface StoredNormalizedTrackReference {
  id: string;
  fingerprint: string;
}

export interface StoredTrackClassification extends TrackClassification {
  normalizedTrackId: string;
}

export interface LibrarySyncJobData {
  syncId: string;
  userId: string;
}

export interface LibrarySyncQueue {
  createQueue?(name: typeof LIBRARY_SYNC_JOB_NAME): Promise<void>;
  send(
    name: typeof LIBRARY_SYNC_JOB_NAME,
    data: LibrarySyncJobData,
    options: {
      retryLimit: number;
      retryDelay: number;
      retryBackoff: boolean;
      singletonKey: string;
    }
  ): Promise<string | null>;
}

export interface LibrarySyncStore {
  getConnectedAppleMusicConnection(userId: string): Promise<AppleMusicConnectionSummary | null>;
  createQueuedSync(userId: string): Promise<LibrarySyncSummary>;
  createJobEvent(input: {
    librarySyncId: string;
    stage: string;
    level: "info" | "warn" | "error";
    message: string;
    details?: Record<string, unknown>;
  }): Promise<void>;
  getSyncForUser(input: { syncId: string; userId: string }): Promise<LibrarySyncSummary | null>;
  getLatestSyncForUser(userId: string): Promise<LibrarySyncSummary | null>;
  listSyncEvents(syncId: string): Promise<LibrarySyncJobEvent[]>;
  markSyncing(input: { syncId: string; userId: string }): Promise<void>;
  storeRawTracks(input: { syncId: string; tracks: RawAppleMusicTrackInput[] }): Promise<void>;
  storeNormalizedTracks(input: {
    syncId: string;
    userId: string;
    tracks: NormalizedTrack[];
  }): Promise<{
    normalizedTrackIds: string[];
    normalizedTracks: StoredNormalizedTrackReference[];
  }>;
  storeTrackClassifications(input: {
    classifications: StoredTrackClassification[];
  }): Promise<void>;
  markNormalizedTracksStored(input: {
    syncId: string;
    userId: string;
    rawTrackCount: number;
    normalizedTrackCount: number;
    duplicateCount: number;
  }): Promise<void>;
  markFailed(input: {
    syncId: string;
    userId: string;
    errorSummary: string;
  }): Promise<void>;
}

type LibrarySyncRow = {
  id: string;
  user_id: string;
  status: LibrarySyncStatus;
  raw_track_count: number;
  normalized_track_count: number;
  duplicate_count: number;
  error_summary: string | null;
  created_at: string;
  updated_at: string;
};

type JobEventRow = {
  id: string;
  library_sync_id: string;
  stage: string;
  level: "info" | "warn" | "error";
  message: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

type AppleMusicConnectionRow = {
  id: string;
  status: "connected" | "expired" | "revoked" | "error";
  storefront: string;
  encrypted_user_token?: string;
};

export type QueueLibrarySyncResult =
  | {
      status: "queued";
      sync: LibrarySyncSummary;
      jobId: string | null;
    }
  | {
      status: "missing_apple_music_connection";
    };

export type QueueLibrarySyncAfterConnectionResult =
  | QueueLibrarySyncResult
  | {
      status: "already_active";
      sync: LibrarySyncSummary;
    };

const activeSyncStatuses = new Set<LibrarySyncStatus>(["queued", "syncing", "normalizing"]);

export async function queueLibrarySync(input: {
  store: LibrarySyncStore;
  queue: LibrarySyncQueue;
  userId: string;
}): Promise<QueueLibrarySyncResult> {
  await input.queue.createQueue?.(LIBRARY_SYNC_JOB_NAME);

  const connection = await input.store.getConnectedAppleMusicConnection(input.userId);

  if (!connection) {
    return { status: "missing_apple_music_connection" };
  }

  const sync = await input.store.createQueuedSync(input.userId);
  const jobId = await input.queue.send(
    LIBRARY_SYNC_JOB_NAME,
    {
      syncId: sync.id,
      userId: input.userId
    },
    {
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
      singletonKey: sync.id
    }
  );

  await input.store.createJobEvent({
    librarySyncId: sync.id,
    stage: "library_sync",
    level: "info",
    message: "Library sync queued.",
    details: {
      jobId
    }
  });

  return {
    status: "queued",
    sync,
    jobId
  };
}

export async function queueLibrarySyncAfterConnection(input: {
  store: LibrarySyncStore;
  queue: LibrarySyncQueue;
  userId: string;
}): Promise<QueueLibrarySyncAfterConnectionResult> {
  const latestSync = await input.store.getLatestSyncForUser(input.userId);

  if (latestSync && activeSyncStatuses.has(latestSync.status)) {
    return {
      status: "already_active",
      sync: latestSync
    };
  }

  return queueLibrarySync(input);
}

export async function handleLibrarySyncJob(input: {
  store: LibrarySyncStore;
  data: LibrarySyncJobData;
  createDeveloperToken?: typeof createAppleDeveloperToken;
  fetchLibrarySongs?: (credentials: {
    developerToken: string;
    musicUserToken: string;
    storefront?: string;
  }) => Promise<AppleLibrarySongResource[]>;
  decryptUserToken?: (encryptedUserToken: string) => string;
  classifyNormalizedTracks?: typeof classifyTracks;
}) {
  await input.store.markSyncing({
    syncId: input.data.syncId,
    userId: input.data.userId
  });

  await input.store.createJobEvent({
    librarySyncId: input.data.syncId,
    stage: "library_sync",
    level: "info",
    message: "Library sync worker picked up the job."
  });

  await runRawLibrarySync({
    store: input.store,
    syncId: input.data.syncId,
    userId: input.data.userId,
    createDeveloperToken: input.createDeveloperToken,
    fetchLibrarySongs: input.fetchLibrarySongs,
    decryptUserToken: input.decryptUserToken
  });
}

export async function runRawLibrarySync(input: {
  store: LibrarySyncStore;
  syncId: string;
  userId: string;
  createDeveloperToken?: typeof createAppleDeveloperToken;
  fetchLibrarySongs?: (credentials: {
    developerToken: string;
    musicUserToken: string;
    storefront?: string;
  }) => Promise<AppleLibrarySongResource[]>;
  decryptUserToken?: (encryptedUserToken: string) => string;
  classifyNormalizedTracks?: typeof classifyTracks;
}) {
  try {
    const connection = await input.store.getConnectedAppleMusicConnection(input.userId);

    if (!connection?.encryptedUserToken) {
      throw new Error("Connected Apple Music token is unavailable.");
    }

    const developerToken = await (input.createDeveloperToken ?? createAppleDeveloperToken)();
    const musicUserToken = (input.decryptUserToken ?? decryptAppleMusicUserToken)(
      connection.encryptedUserToken
    );
    const tracks = await (input.fetchLibrarySongs ?? fetchAppleLibrarySongsRaw)({
      developerToken: developerToken.developerToken,
      musicUserToken,
      storefront: connection.storefront
    });
    const rawTracks = tracks.map((track): RawAppleMusicTrackInput => ({
      appleSongId: track.id,
      payload: track
    }));
    const normalizedTracks = dedupeTracks(tracks.map((track) => normalizeTrack(mapLibrarySong(track))));
    const duplicateCount = rawTracks.length - normalizedTracks.length;

    await input.store.storeRawTracks({
      syncId: input.syncId,
      tracks: rawTracks
    });
    const storedNormalizedTracks = await input.store.storeNormalizedTracks({
      syncId: input.syncId,
      userId: input.userId,
      tracks: normalizedTracks
    });
    const normalizedTrackIdsByFingerprint = new Map(
      storedNormalizedTracks.normalizedTracks.map((track) => [track.fingerprint, track.id])
    );
    const trackClassifications = await (input.classifyNormalizedTracks ?? classifyTracks)(normalizedTracks);
    const classifications = trackClassifications.flatMap((classification): StoredTrackClassification[] => {
      const normalizedTrackId = normalizedTrackIdsByFingerprint.get(classification.fingerprint);

      if (!normalizedTrackId) {
        return [];
      }

      return [
        {
          normalizedTrackId,
          ...classification
        }
      ];
    });

    await input.store.storeTrackClassifications({ classifications });
    await input.store.markNormalizedTracksStored({
      syncId: input.syncId,
      userId: input.userId,
      rawTrackCount: rawTracks.length,
      normalizedTrackCount: normalizedTracks.length,
      duplicateCount
    });
    await input.store.createJobEvent({
      librarySyncId: input.syncId,
      stage: "classification",
      level: "info",
      message: `Classified ${classifications.length} tracks with metadata heuristics and structured OpenAI fallback.`
    });
    await input.store.createJobEvent({
      librarySyncId: input.syncId,
      stage: "library_sync",
      level: "info",
      message: `Normalized ${normalizedTracks.length} tracks and removed ${duplicateCount} duplicates.`
    });
  } catch (error) {
    const errorSummary = error instanceof Error ? error.message : "Library sync failed.";

    await input.store.markFailed({
      syncId: input.syncId,
      userId: input.userId,
      errorSummary
    });
    await input.store.createJobEvent({
      librarySyncId: input.syncId,
      stage: "library_sync",
      level: "error",
      message: errorSummary
    });

    throw error;
  }
}

export function createSupabaseLibrarySyncStore(supabase: SupabaseClient): LibrarySyncStore {
  return {
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

      return data ? mapAppleMusicConnection(data as AppleMusicConnectionRow) : null;
    },

    async createQueuedSync(userId) {
      const { data, error } = await supabase
        .from("library_syncs")
        .insert({
          user_id: userId,
          status: "queued"
        })
        .select(librarySyncColumns)
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to create library sync.");
      }

      return mapLibrarySync(data as LibrarySyncRow);
    },

    async createJobEvent(input) {
      const { error } = await supabase
        .from("job_events")
        .insert({
          library_sync_id: input.librarySyncId,
          stage: input.stage,
          level: input.level,
          message: input.message,
          details: input.details ?? null
        });

      if (error) {
        throw new Error(error.message);
      }
    },

    async getSyncForUser(input) {
      const { data, error } = await supabase
        .from("library_syncs")
        .select(librarySyncColumns)
        .eq("id", input.syncId)
        .eq("user_id", input.userId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data ? mapLibrarySync(data as LibrarySyncRow) : null;
    },

    async getLatestSyncForUser(userId) {
      const { data, error } = await supabase
        .from("library_syncs")
        .select(librarySyncColumns)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data ? mapLibrarySync(data as LibrarySyncRow) : null;
    },

    async listSyncEvents(syncId) {
      const { data, error } = await supabase
        .from("job_events")
        .select("id,library_sync_id,stage,level,message,details,created_at")
        .eq("library_sync_id", syncId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []).map((event) => mapJobEvent(event as JobEventRow));
    },

    async markSyncing(input) {
      const { error } = await supabase
        .from("library_syncs")
        .update({
          status: "syncing",
          updated_at: new Date().toISOString()
        })
        .eq("id", input.syncId)
        .eq("user_id", input.userId);

      if (error) {
        throw new Error(error.message);
      }
    },

    async storeRawTracks(input) {
      if (input.tracks.length === 0) {
        return;
      }

      const { error } = await supabase
        .from("library_tracks_raw")
        .insert(
          input.tracks.map((track) => ({
            sync_id: input.syncId,
            apple_song_id: track.appleSongId,
            payload: track.payload
          }))
        );

      if (error) {
        throw new Error(error.message);
      }
    },

    async storeNormalizedTracks(input) {
      if (input.tracks.length === 0) {
        return { normalizedTrackIds: [], normalizedTracks: [] };
      }

      const { data, error } = await supabase
        .from("tracks_normalized")
        .upsert(
          input.tracks.map((track) => ({
            fingerprint: track.fingerprint,
            apple_song_id: track.appleSongId,
            isrc: track.isrc ?? null,
            name: track.name,
            artist_name: track.artistName,
            album_name: track.albumName ?? null,
            normalized_name: track.normalizedName,
            normalized_artist: track.normalizedArtist,
            normalized_album: track.normalizedAlbum ?? null,
            duration_in_millis: track.durationInMillis ?? null,
            genre_names: track.genreNames,
            content_rating: track.contentRating ?? null
          })),
          {
            onConflict: "fingerprint"
          }
        )
        .select("id,fingerprint");

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to store normalized tracks.");
      }

      const normalizedTracks = data.map((row) => ({
        id: row.id as string,
        fingerprint: row.fingerprint as string
      }));
      const normalizedTrackIds = normalizedTracks.map((track) => track.id);
      const { error: ownershipError } = await supabase
        .from("track_ownership")
        .upsert(
          normalizedTrackIds.map((normalizedTrackId) => ({
            user_id: input.userId,
            sync_id: input.syncId,
            normalized_track_id: normalizedTrackId
          })),
          {
            onConflict: "sync_id,normalized_track_id"
          }
        );

      if (ownershipError) {
        throw new Error(ownershipError.message);
      }

      return { normalizedTrackIds, normalizedTracks };
    },

    async storeTrackClassifications(input) {
      if (input.classifications.length === 0) {
        return;
      }

      const { error } = await supabase
        .from("track_classifications")
        .upsert(
          input.classifications.map((classification) => ({
            normalized_track_id: classification.normalizedTrackId,
            version: classification.version,
            metadata_hash: classification.metadataHash,
            language: classification.language,
            genre: classification.genre,
            subgenres: classification.subgenres,
            moods: classification.moods,
            energy: classification.energy,
            confidence: classification.confidence,
            source: classification.source
          })),
          {
            onConflict: "normalized_track_id,version,metadata_hash"
          }
        );

      if (error) {
        throw new Error(error.message);
      }
    },

    async markNormalizedTracksStored(input) {
      const { error } = await supabase
        .from("library_syncs")
        .update({
          status: "completed",
          raw_track_count: input.rawTrackCount,
          normalized_track_count: input.normalizedTrackCount,
          duplicate_count: input.duplicateCount,
          updated_at: new Date().toISOString()
        })
        .eq("id", input.syncId)
        .eq("user_id", input.userId);

      if (error) {
        throw new Error(error.message);
      }
    },

    async markFailed(input) {
      const { error } = await supabase
        .from("library_syncs")
        .update({
          status: "failed",
          error_summary: input.errorSummary,
          updated_at: new Date().toISOString()
        })
        .eq("id", input.syncId)
        .eq("user_id", input.userId);

      if (error) {
        throw new Error(error.message);
      }
    }
  };
}

export async function getLibrarySyncStatus(input: {
  store: LibrarySyncStore;
  syncId: string;
  userId: string;
}) {
  const sync = await input.store.getSyncForUser({
    syncId: input.syncId,
    userId: input.userId
  });

  if (!sync) {
    return null;
  }

  return {
    sync,
    events: await input.store.listSyncEvents(sync.id)
  };
}

export async function getLatestLibrarySyncStatus(input: {
  store: LibrarySyncStore;
  userId: string;
}) {
  const sync = await input.store.getLatestSyncForUser(input.userId);

  if (!sync) {
    return null;
  }

  return {
    sync,
    events: await input.store.listSyncEvents(sync.id)
  };
}

const librarySyncColumns =
  "id,user_id,status,raw_track_count,normalized_track_count,duplicate_count,error_summary,created_at,updated_at";

function mapLibrarySync(row: LibrarySyncRow): LibrarySyncSummary {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    rawTrackCount: row.raw_track_count,
    normalizedTrackCount: row.normalized_track_count,
    duplicateCount: row.duplicate_count,
    errorSummary: row.error_summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapJobEvent(row: JobEventRow): LibrarySyncJobEvent {
  return {
    id: row.id,
    librarySyncId: row.library_sync_id,
    stage: row.stage,
    level: row.level,
    message: row.message,
    details: row.details,
    createdAt: row.created_at
  };
}

function mapAppleMusicConnection(row: AppleMusicConnectionRow): AppleMusicConnectionSummary {
  return {
    id: row.id,
    status: row.status,
    storefront: row.storefront,
    encryptedUserToken: row.encrypted_user_token
  };
}

async function fetchAppleLibrarySongsRaw(credentials: {
  developerToken: string;
  musicUserToken: string;
  storefront?: string;
}) {
  return new AppleMusicClient(credentials).getAllLibrarySongs({ limit: 100 });
}

function mapLibrarySong(resource: AppleLibrarySongResource): RawAppleTrack {
  return {
    id: resource.id,
    name: resource.attributes?.name ?? "Unknown track",
    artistName: resource.attributes?.artistName ?? "Unknown artist",
    albumName: resource.attributes?.albumName,
    durationInMillis: resource.attributes?.durationInMillis,
    genreNames: resource.attributes?.genreNames,
    contentRating: resource.attributes?.contentRating,
    isrc: resource.attributes?.isrc
  };
}
