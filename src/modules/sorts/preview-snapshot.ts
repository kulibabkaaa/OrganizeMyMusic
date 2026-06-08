import type { SupabaseClient } from "@supabase/supabase-js";

import type { ParsedPlaylistRequest } from "@/modules/playlist-requests/parser";
import { generateRequestedPlaylists } from "@/modules/sorts/playlist-rules";
import type {
  GeneratedPlaylist,
  NormalizedTrack,
  PaymentStatus,
  SortRunState,
  TrackClassification
} from "@/types/domain";

export interface PreviewSnapshot {
  sortRunId: string;
  librarySyncId: string;
  generatedAt: string;
  playlists: GeneratedPlaylist[];
}

export interface PreviewSortRun {
  id: string;
  userId: string;
  librarySyncId: string | null;
  state: SortRunState;
  paymentStatus: PaymentStatus;
  previewSnapshot: PreviewSnapshot | null;
  requests: ParsedPlaylistRequest[];
  generatedPlaylistCount?: number;
  applePlaylistIdCount?: number;
  events?: PreviewSortRunJobEvent[];
}

export interface PreviewTrackClassification extends TrackClassification {
  normalizedTrackId: string;
}

export interface PreviewSortRunJobEvent {
  id: string;
  sortRunId: string;
  stage: string;
  level: "info" | "warn" | "error";
  message: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface PreviewSnapshotStore {
  getSortRunForPreview(input: {
    sortRunId: string;
    userId: string;
  }): Promise<PreviewSortRun | null>;
  listTracksForPreview(input: {
    librarySyncId: string;
    userId: string;
  }): Promise<NormalizedTrack[]>;
  listClassificationsForPreview(input: {
    normalizedTrackIds: string[];
  }): Promise<PreviewTrackClassification[]>;
  savePreviewSnapshot(input: {
    sortRun: PreviewSortRun;
    snapshot: PreviewSnapshot;
  }): Promise<PreviewSnapshot>;
}

export type PreviewSnapshotResult =
  | {
      status: "created";
      snapshot: PreviewSnapshot;
    }
  | {
      status: "existing";
      snapshot: PreviewSnapshot;
    }
  | {
      status: "immutable";
      snapshot: PreviewSnapshot | null;
    }
  | {
      status: "not_found";
    };

const immutablePreviewStates = new Set<SortRunState>([
  "awaiting_payment",
  "paid",
  "creating_playlists",
  "completed"
]);

export function isPreviewImmutable(sortRun: Pick<PreviewSortRun, "state" | "paymentStatus">) {
  return immutablePreviewStates.has(sortRun.state) || sortRun.paymentStatus === "paid";
}

export async function generateAndStorePreviewSnapshot(input: {
  store: PreviewSnapshotStore;
  sortRunId: string;
  userId: string;
  now?: () => string;
}): Promise<PreviewSnapshotResult> {
  const sortRun = await input.store.getSortRunForPreview({
    sortRunId: input.sortRunId,
    userId: input.userId
  });

  if (!sortRun) {
    return { status: "not_found" };
  }

  if (isPreviewImmutable(sortRun)) {
    return {
      status: "immutable",
      snapshot: sortRun.previewSnapshot
    };
  }

  if (sortRun.previewSnapshot && sortRun.state === "preview_ready") {
    return {
      status: "existing",
      snapshot: sortRun.previewSnapshot
    };
  }

  if (!sortRun.librarySyncId) {
    return { status: "not_found" };
  }

  const tracks = await input.store.listTracksForPreview({
    librarySyncId: sortRun.librarySyncId,
    userId: sortRun.userId
  });
  const classifications = await input.store.listClassificationsForPreview({
    normalizedTrackIds: tracks.map((track) => track.id)
  });
  const fingerprintByNormalizedTrackId = new Map(tracks.map((track) => [track.id, track.fingerprint]));
  const classificationsWithFingerprints = classifications.map((classification) => ({
    ...classification,
    fingerprint:
      classification.fingerprint ||
      fingerprintByNormalizedTrackId.get(classification.normalizedTrackId) ||
      classification.fingerprint
  }));
  const playlists = generateRequestedPlaylists({
    requests: sortRun.requests,
    tracks,
    classifications: classificationsWithFingerprints
  });
  const snapshot: PreviewSnapshot = {
    sortRunId: sortRun.id,
    librarySyncId: sortRun.librarySyncId,
    generatedAt: input.now?.() ?? new Date().toISOString(),
    playlists
  };

  return {
    status: "created",
    snapshot: await input.store.savePreviewSnapshot({
      sortRun,
      snapshot
    })
  };
}

export async function saveSortRunPreviewSnapshotOnly<TSnapshot>(input: {
  supabase: SupabaseClient;
  sortRun: PreviewSortRun;
  snapshot: TSnapshot;
}) {
  const { error } = await input.supabase
    .from("sort_runs")
    .update({
      state: "preview_ready",
      preview_snapshot: input.snapshot,
      updated_at: new Date().toISOString()
    })
    .eq("id", input.sortRun.id)
    .eq("user_id", input.sortRun.userId)
    .eq("state", input.sortRun.state);

  if (error) {
    throw new Error(error.message);
  }

  return input.snapshot;
}

type SortRunRow = {
  id: string;
  user_id: string;
  library_sync_id: string;
  state: SortRunState;
  payment_status: PaymentStatus;
  preview_snapshot: PreviewSnapshot | null;
};

type PlaylistRequestRow = {
  user_prompt: string;
  parsed_rules: ParsedPlaylistRequest["parsedRules"];
};

type NormalizedTrackRow = {
  id: string;
  apple_song_id: string | null;
  isrc: string | null;
  name: string;
  artist_name: string;
  album_name: string | null;
  normalized_name: string;
  normalized_artist: string;
  normalized_album: string | null;
  fingerprint: string;
  duration_in_millis: number | null;
  genre_names: string[];
  content_rating: "clean" | "explicit" | null;
};

type TrackOwnershipRow = {
  normalized_track_id: string;
};

type TrackClassificationRow = {
  normalized_track_id: string;
  language: TrackClassification["language"];
  genre: TrackClassification["genre"];
  subgenres: string[];
  moods: TrackClassification["moods"];
  energy: number | null;
  confidence: number;
  source: TrackClassification["source"];
  version: number;
  metadata_hash: string;
};

type SortRunJobEventRow = {
  id: string;
  sort_run_id: string;
  stage: string;
  level: "info" | "warn" | "error";
  message: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

type SortPlaylistStatusRow = {
  id: string;
  apple_playlist_id: string | null;
};

export function createSupabasePreviewSnapshotStore(
  supabase: SupabaseClient
): PreviewSnapshotStore {
  return {
    async getSortRunForPreview(input) {
      const { data: sortRun, error: sortRunError } = await supabase
        .from("sort_runs")
        .select("id,user_id,library_sync_id,state,payment_status,preview_snapshot")
        .eq("id", input.sortRunId)
        .eq("user_id", input.userId)
        .maybeSingle();

      if (sortRunError) {
        throw new Error(sortRunError.message);
      }

      if (!sortRun) {
        return null;
      }

      const [requestsResult, eventsResult, playlistsResult] = await Promise.all([
        supabase
          .from("playlist_requests")
          .select("user_prompt,parsed_rules")
          .eq("sort_run_id", input.sortRunId),
        supabase
          .from("job_events")
          .select("id,sort_run_id,stage,level,message,details,created_at")
          .eq("sort_run_id", input.sortRunId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("sort_playlists")
          .select("id,apple_playlist_id")
          .eq("sort_run_id", input.sortRunId)
      ]);

      if (requestsResult.error || !requestsResult.data) {
        throw new Error(requestsResult.error?.message ?? "Unable to load playlist requests.");
      }

      if (eventsResult.error || !eventsResult.data) {
        throw new Error(eventsResult.error?.message ?? "Unable to load sort run events.");
      }

      if (playlistsResult.error || !playlistsResult.data) {
        throw new Error(playlistsResult.error?.message ?? "Unable to load Sort playlists.");
      }

      const row = sortRun as SortRunRow;
      const playlists = playlistsResult.data as SortPlaylistStatusRow[];

      return {
        id: row.id,
        userId: row.user_id,
        librarySyncId: row.library_sync_id,
        state: row.state,
        paymentStatus: row.payment_status,
        previewSnapshot: row.preview_snapshot,
        requests: (requestsResult.data as PlaylistRequestRow[]).map((request) => ({
          userPrompt: request.user_prompt,
          parsedRules: request.parsed_rules
        })),
        generatedPlaylistCount: playlists.length,
        applePlaylistIdCount: playlists.filter((playlist) => playlist.apple_playlist_id).length,
        events: (eventsResult.data as SortRunJobEventRow[]).map((event) => ({
          id: event.id,
          sortRunId: event.sort_run_id,
          stage: event.stage,
          level: event.level,
          message: event.message,
          details: event.details,
          createdAt: event.created_at
        }))
      };
    },

    async listTracksForPreview(input) {
      const { data: ownershipRows, error: ownershipError } = await supabase
        .from("track_ownership")
        .select("normalized_track_id")
        .eq("sync_id", input.librarySyncId)
        .eq("user_id", input.userId);

      if (ownershipError || !ownershipRows) {
        throw new Error(ownershipError?.message ?? "Unable to load track ownership.");
      }

      const normalizedTrackIds = (ownershipRows as TrackOwnershipRow[]).map(
        (row) => row.normalized_track_id
      );

      if (normalizedTrackIds.length === 0) {
        return [];
      }

      const { data: trackRows, error: trackError } = await supabase
        .from("tracks_normalized")
        .select(
          "id,apple_song_id,isrc,name,artist_name,album_name,normalized_name,normalized_artist,normalized_album,fingerprint,duration_in_millis,genre_names,content_rating"
        )
        .in("id", normalizedTrackIds);

      if (trackError || !trackRows) {
        throw new Error(trackError?.message ?? "Unable to load normalized tracks.");
      }

      return (trackRows as NormalizedTrackRow[]).map((track) => ({
        id: track.id,
        appleSongId: track.apple_song_id ?? undefined,
        isrc: track.isrc ?? undefined,
        name: track.name,
        artistName: track.artist_name,
        albumName: track.album_name ?? undefined,
        normalizedName: track.normalized_name,
        normalizedArtist: track.normalized_artist,
        normalizedAlbum: track.normalized_album ?? undefined,
        fingerprint: track.fingerprint,
        durationInMillis: track.duration_in_millis ?? undefined,
        genreNames: track.genre_names,
        contentRating: track.content_rating ?? undefined
      }));
    },

    async listClassificationsForPreview(input) {
      if (input.normalizedTrackIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("track_classifications")
        .select(
          "normalized_track_id,language,genre,subgenres,moods,energy,confidence,source,version,metadata_hash"
        )
        .in("normalized_track_id", input.normalizedTrackIds);

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to load track classifications.");
      }

      return (data as TrackClassificationRow[]).map((classification) => ({
        normalizedTrackId: classification.normalized_track_id,
        fingerprint: "",
        language: classification.language,
        genre: classification.genre,
        subgenres: classification.subgenres,
        moods: classification.moods,
        energy:
          classification.energy === null ? null : Number(classification.energy),
        confidence: Number(classification.confidence),
        source: classification.source,
        version: classification.version,
        metadataHash: classification.metadata_hash
      }));
    },

    async savePreviewSnapshot(input) {
      const { error: updateError } = await supabase
        .from("sort_runs")
        .update({
          state: "preview_ready",
          preview_snapshot: input.snapshot,
          updated_at: new Date().toISOString()
        })
        .eq("id", input.sortRun.id)
        .eq("user_id", input.sortRun.userId)
        .eq("state", input.sortRun.state);

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (input.snapshot.playlists.length === 0) {
        return input.snapshot;
      }

      const { data: playlistRows, error: playlistError } = await supabase
        .from("sort_playlists")
        .insert(
          input.snapshot.playlists.map((playlist) => ({
            sort_run_id: input.sortRun.id,
            dimension: playlist.dimension,
            title: playlist.title,
            description: playlist.description,
            confidence_label: playlist.confidenceLabel,
            playlist_rules: {
              generatedPlaylistId: playlist.id
            },
            selected: true
          }))
        )
        .select("id");

      if (playlistError || !playlistRows) {
        throw new Error(playlistError?.message ?? "Unable to store generated playlists.");
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
                  reason: track.reason
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

      return input.snapshot;
    }
  };
}
