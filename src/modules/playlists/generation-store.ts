import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabasePlaylistRecipeStore } from "@/modules/playlist-recipes/store";
import { createSupabasePlaylistStore } from "@/modules/playlists/store";
import { createSupabasePreviewSnapshotStore } from "@/modules/sorts/preview-snapshot";
import { generateRecipePlaylists } from "@/modules/sorts/playlist-rules";
import type {
  NormalizedTrack,
  PlaylistGeneration,
  PlaylistGenerationTrack,
  PlaylistRecipe,
  PlaylistTrackDecision
} from "@/types/domain";

type LibrarySyncRow = {
  id: string;
};

type PlaylistGenerationRow = {
  id: string;
  user_id: string;
  playlist_id: string;
  recipe_id: string | null;
  sort_run_id: string | null;
  library_sync_id: string | null;
  status: PlaylistGeneration["status"];
  recipe_snapshot: Record<string, unknown>;
  error_summary: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
};

type PlaylistGenerationTrackRow = {
  id: string;
  generation_id: string;
  normalized_track_id: string;
  position: number;
  score: number | null;
  reason: string | null;
  decision: PlaylistTrackDecision;
  created_at: string;
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

export interface PlaylistGenerationTrackView extends PlaylistGenerationTrack {
  track: NormalizedTrack | null;
}

export interface PlaylistGenerationView {
  generation: PlaylistGeneration;
  tracks: PlaylistGenerationTrackView[];
}

export interface PlaylistGenerationHistoryItem {
  generation: PlaylistGeneration;
  trackCount: number | null;
}

export type GeneratePlaylistResult =
  | {
      status: "generated";
      recipe: PlaylistRecipe;
      generation: PlaylistGenerationView;
    }
  | {
      status: "playlist_not_found" | "recipe_required" | "library_sync_required";
      message: string;
    };

export interface PlaylistGenerationStore {
  getLatestGeneration(input: {
    userId: string;
    playlistId: string;
  }): Promise<PlaylistGenerationView | null>;
  listGenerationHistory(input: {
    userId: string;
    playlistId: string;
    limit?: number;
  }): Promise<PlaylistGenerationHistoryItem[]>;
  generatePlaylist(input: {
    userId: string;
    playlistId: string;
    now?: () => string;
  }): Promise<GeneratePlaylistResult>;
  updateTrackDecisions(input: {
    userId: string;
    playlistId: string;
    generationId: string;
    decisions: Array<{ trackId: string; decision: PlaylistTrackDecision }>;
  }): Promise<PlaylistGenerationView | null>;
}

export function createSupabasePlaylistGenerationStore(
  supabase: SupabaseClient
): PlaylistGenerationStore {
  return {
    async getLatestGeneration(input) {
      const generation = await getLatestGenerationRow(supabase, input);
      return generation
        ? loadGenerationView(supabase, {
            generation
          })
        : null;
    },

    async listGenerationHistory(input) {
      const generations = await listGenerationRows(supabase, {
        userId: input.userId,
        playlistId: input.playlistId,
        limit: input.limit ?? 8
      });
      const trackCounts = await getGenerationTrackCounts(
        supabase,
        generations.map((generation) => generation.id)
      );

      return generations.map((generation) => ({
        generation: mapGenerationRow(generation),
        trackCount: trackCounts.get(generation.id) ?? null
      }));
    },

    async generatePlaylist(input) {
      const playlistStore = createSupabasePlaylistStore(supabase);
      const recipeStore = createSupabasePlaylistRecipeStore(supabase);
      const previewStore = createSupabasePreviewSnapshotStore(supabase);
      const playlist = await playlistStore.getPlaylist({
        userId: input.userId,
        playlistId: input.playlistId
      });

      if (!playlist) {
        return {
          status: "playlist_not_found",
          message: "Playlist not found."
        };
      }

      const recipes = await recipeStore.listRecipesForPlaylist({
        userId: input.userId,
        playlistId: playlist.id
      });
      const recipe = recipes[0] ?? null;

      if (!recipe) {
        return {
          status: "recipe_required",
          message: "Save a playlist recipe before generating tracks."
        };
      }

      const latestSyncId = await getLatestCompletedLibrarySyncId(supabase, input.userId);

      if (!latestSyncId) {
        return {
          status: "library_sync_required",
          message: "Complete an Apple Music library sync before generating this playlist."
        };
      }

      const tracks = await previewStore.listTracksForPreview({
        userId: input.userId,
        librarySyncId: latestSyncId
      });
      const classifications = await previewStore.listClassificationsForPreview({
        normalizedTrackIds: tracks.map((track) => track.id)
      });
      const fingerprintByNormalizedTrackId = new Map(
        tracks.map((track) => [track.id, track.fingerprint])
      );
      const playlistPlan = generateRecipePlaylists({
        recipes: [recipe],
        tracks,
        classifications: classifications.map((classification) => ({
          ...classification,
          fingerprint:
            classification.fingerprint ||
            fingerprintByNormalizedTrackId.get(classification.normalizedTrackId) ||
            classification.fingerprint
        }))
      })[0];
      const generatedAt = input.now?.() ?? new Date().toISOString();
      const { data: generationRow, error: generationError } = await supabase
        .from("playlist_generations")
        .insert({
          user_id: input.userId,
          playlist_id: playlist.id,
          recipe_id: recipe.id,
          sort_run_id: null,
          library_sync_id: latestSyncId,
          status: "ready_for_review",
          recipe_snapshot: {
            recipeId: recipe.id,
            recipeName: recipe.name,
            playlistNote: recipe.playlistNote,
            tags: recipe.tags,
            targetTrackMin: recipe.targetTrackMin,
            targetTrackMax: recipe.targetTrackMax,
            qualityWarnings: playlistPlan?.qualityWarnings ?? [],
            matchStats: playlistPlan?.matchStats ?? null
          },
          generated_at: generatedAt
        })
        .select(playlistGenerationSelect)
        .single();

      if (generationError || !generationRow) {
        throw new Error(generationError?.message ?? "Unable to store playlist generation.");
      }

      const generatedTracks = playlistPlan?.tracks ?? [];

      if (generatedTracks.length > 0) {
        const { error: tracksError } = await supabase.from("playlist_generation_tracks").insert(
          generatedTracks.flatMap((track) =>
            track.normalizedTrackId
              ? [
                  {
                    generation_id: (generationRow as PlaylistGenerationRow).id,
                    normalized_track_id: track.normalizedTrackId,
                    position: track.position,
                    score: track.score,
                    reason: track.reason,
                    decision: "keep"
                  }
                ]
              : []
          )
        );

        if (tracksError) {
          throw new Error(tracksError.message);
        }
      }

      await playlistStore.updatePlaylist({
        userId: input.userId,
        playlistId: playlist.id,
        values: {
          status: "active",
          latestLibrarySyncId: latestSyncId,
          lastGeneratedAt: generatedAt
        }
      });

      return {
        status: "generated",
        recipe,
        generation: await loadGenerationView(supabase, {
          generation: generationRow as PlaylistGenerationRow
        })
      };
    },

    async updateTrackDecisions(input) {
      const generation = await getGenerationRow(supabase, {
        userId: input.userId,
        playlistId: input.playlistId,
        generationId: input.generationId
      });

      if (!generation) {
        return null;
      }

      const updates = await Promise.all(
        input.decisions.map((item) =>
          supabase
            .from("playlist_generation_tracks")
            .update({ decision: item.decision })
            .eq("id", item.trackId)
            .eq("generation_id", input.generationId)
        )
      );
      const error = updates.find((update) => update.error)?.error;

      if (error) {
        throw new Error(error.message);
      }

      const hasReviewed = input.decisions.length > 0;

      if (hasReviewed && generation.status === "ready_for_review") {
        const { error: statusError } = await supabase
          .from("playlist_generations")
          .update({
            status: "reviewed",
            updated_at: new Date().toISOString()
          })
          .eq("id", generation.id)
          .eq("user_id", input.userId);

        if (statusError) {
          throw new Error(statusError.message);
        }
      }

      return this.getLatestGeneration({
        userId: input.userId,
        playlistId: input.playlistId
      });
    }
  };
}

export const playlistGenerationSelect =
  "id,user_id,playlist_id,recipe_id,sort_run_id,library_sync_id,status,recipe_snapshot,error_summary,generated_at,created_at,updated_at";

function mapGenerationRow(row: PlaylistGenerationRow): PlaylistGeneration {
  return {
    id: row.id,
    userId: row.user_id,
    playlistId: row.playlist_id,
    recipeId: row.recipe_id,
    sortRunId: row.sort_run_id,
    librarySyncId: row.library_sync_id,
    status: row.status,
    recipeSnapshot: row.recipe_snapshot,
    errorSummary: row.error_summary,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapGenerationTrackRow(row: PlaylistGenerationTrackRow): PlaylistGenerationTrack {
  return {
    id: row.id,
    generationId: row.generation_id,
    normalizedTrackId: row.normalized_track_id,
    position: row.position,
    score: row.score === null ? null : Number(row.score),
    reason: row.reason,
    decision: row.decision,
    createdAt: row.created_at
  };
}

function mapNormalizedTrackRow(row: NormalizedTrackRow): NormalizedTrack {
  return {
    id: row.id,
    appleSongId: row.apple_song_id ?? undefined,
    isrc: row.isrc ?? undefined,
    name: row.name,
    artistName: row.artist_name,
    albumName: row.album_name ?? undefined,
    normalizedName: row.normalized_name,
    normalizedArtist: row.normalized_artist,
    normalizedAlbum: row.normalized_album ?? undefined,
    fingerprint: row.fingerprint,
    durationInMillis: row.duration_in_millis ?? undefined,
    genreNames: row.genre_names,
    contentRating: row.content_rating ?? undefined
  };
}

async function getLatestCompletedLibrarySyncId(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("library_syncs")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as LibrarySyncRow | null)?.id ?? null;
}

async function getLatestGenerationRow(
  supabase: SupabaseClient,
  input: { userId: string; playlistId: string }
) {
  const { data, error } = await supabase
    .from("playlist_generations")
    .select(playlistGenerationSelect)
    .eq("user_id", input.userId)
    .eq("playlist_id", input.playlistId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? (data as PlaylistGenerationRow) : null;
}

async function listGenerationRows(
  supabase: SupabaseClient,
  input: { userId: string; playlistId: string; limit: number }
) {
  const { data, error } = await supabase
    .from("playlist_generations")
    .select(playlistGenerationSelect)
    .eq("user_id", input.userId)
    .eq("playlist_id", input.playlistId)
    .order("created_at", { ascending: false })
    .limit(input.limit);

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to load playlist generation history.");
  }

  return data as PlaylistGenerationRow[];
}

async function getGenerationTrackCounts(supabase: SupabaseClient, generationIds: string[]) {
  const counts = new Map<string, number>();

  if (generationIds.length === 0) {
    return counts;
  }

  await Promise.all(
    generationIds.map(async (generationId) => {
      const { count, error } = await supabase
        .from("playlist_generation_tracks")
        .select("id", { count: "exact", head: true })
        .eq("generation_id", generationId);

      if (error) {
        throw new Error(error.message);
      }

      counts.set(generationId, count ?? 0);
    })
  );

  return counts;
}

async function getGenerationRow(
  supabase: SupabaseClient,
  input: { userId: string; playlistId: string; generationId: string }
) {
  const { data, error } = await supabase
    .from("playlist_generations")
    .select(playlistGenerationSelect)
    .eq("id", input.generationId)
    .eq("user_id", input.userId)
    .eq("playlist_id", input.playlistId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? (data as PlaylistGenerationRow) : null;
}

async function loadGenerationView(
  supabase: SupabaseClient,
  input: { generation: PlaylistGenerationRow }
): Promise<PlaylistGenerationView> {
  const { data: trackRows, error: trackError } = await supabase
    .from("playlist_generation_tracks")
    .select("id,generation_id,normalized_track_id,position,score,reason,decision,created_at")
    .eq("generation_id", input.generation.id)
    .order("position", { ascending: true });

  if (trackError || !trackRows) {
    throw new Error(trackError?.message ?? "Unable to load generated playlist tracks.");
  }

  const tracks = (trackRows as PlaylistGenerationTrackRow[]).map(mapGenerationTrackRow);
  const normalizedTrackIds = tracks.map((track) => track.normalizedTrackId);
  const normalizedTracksById = new Map<string, NormalizedTrack>();

  if (normalizedTrackIds.length > 0) {
    const { data: normalizedRows, error: normalizedError } = await supabase
      .from("tracks_normalized")
      .select(
        "id,apple_song_id,isrc,name,artist_name,album_name,normalized_name,normalized_artist,normalized_album,fingerprint,duration_in_millis,genre_names,content_rating"
      )
      .in("id", normalizedTrackIds);

    if (normalizedError || !normalizedRows) {
      throw new Error(normalizedError?.message ?? "Unable to load generated track details.");
    }

    for (const track of (normalizedRows as NormalizedTrackRow[]).map(mapNormalizedTrackRow)) {
      normalizedTracksById.set(track.id, track);
    }
  }

  return {
    generation: mapGenerationRow(input.generation),
    tracks: tracks.map((track) => ({
      ...track,
      track: normalizedTracksById.get(track.normalizedTrackId) ?? null
    }))
  };
}
