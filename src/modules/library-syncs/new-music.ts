import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabasePlaylistRecipeStore } from "@/modules/playlist-recipes/store";
import { createSupabasePlaylistStore } from "@/modules/playlists/store";
import { createSupabasePreviewSnapshotStore } from "@/modules/sorts/preview-snapshot";
import { generateRecipePlaylists } from "@/modules/sorts/playlist-rules";
import type {
  GeneratedPlaylistTrack,
  NormalizedTrack,
  PersistentPlaylist,
  PlaylistRecipe,
  TrackClassification
} from "@/types/domain";

export interface CompletedLibrarySyncReference {
  id: string;
  createdAt: string;
}

export interface NewMusicSummary {
  latestSyncId: string | null;
  previousSyncId: string | null;
  newTrackCount: number;
  canProcess: boolean;
  message: string;
}

export interface NewMusicStore {
  listRecentCompletedSyncs(input: {
    userId: string;
    limit: number;
  }): Promise<CompletedLibrarySyncReference[]>;
  listOwnedTrackIdsForSync(input: { userId: string; syncId: string }): Promise<string[]>;
  listPlaylistRecipesForNewMusic?(input: { userId: string }): Promise<NewMusicPlaylistRecipe[]>;
  listTracksByIds?(input: { normalizedTrackIds: string[] }): Promise<NormalizedTrack[]>;
  listClassificationsByTrackIds?(input: {
    normalizedTrackIds: string[];
  }): Promise<NewMusicTrackClassification[]>;
  markNewMusicProcessed?(input: {
    userId: string;
    playlistIds: string[];
    syncId: string;
  }): Promise<void>;
  storeNewMusicGenerations?(input: {
    userId: string;
    syncId: string;
    playlistRecipes: NewMusicPlaylistRecipe[];
    recommendations: NewMusicPlaylistRecommendation[];
  }): Promise<void>;
}

export interface NewMusicPlaylistRecipe {
  playlist: PersistentPlaylist;
  recipe: PlaylistRecipe;
}

export interface NewMusicTrackClassification extends TrackClassification {
  normalizedTrackId: string;
}

export interface NewMusicRecommendationTrack {
  normalizedTrackId: string;
  appleSongId: string | null;
  name: string;
  artistName: string;
  albumName: string | null;
  score: number;
  reason: string;
}

export interface NewMusicPlaylistRecommendation {
  playlistId: string;
  playlistName: string;
  recipeId: string;
  recipeName: string;
  trackCount: number;
  tracks: NewMusicRecommendationTrack[];
}

export type ProcessNewMusicResult =
  | {
      status: "processed";
      summary: NewMusicSummary;
      recommendations: NewMusicPlaylistRecommendation[];
    }
  | {
      status: "not_ready" | "no_playlists" | "no_matches";
      summary: NewMusicSummary;
      message: string;
      recommendations: NewMusicPlaylistRecommendation[];
    };

type LibrarySyncRow = {
  id: string;
  created_at: string;
};

type TrackOwnershipRow = {
  normalized_track_id: string;
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

export async function getNewMusicSummary(input: {
  store: NewMusicStore;
  userId: string;
}): Promise<NewMusicSummary> {
  const [latestSync, previousSync] = await input.store.listRecentCompletedSyncs({
    userId: input.userId,
    limit: 2
  });

  if (!latestSync) {
    return {
      latestSyncId: null,
      previousSyncId: null,
      newTrackCount: 0,
      canProcess: false,
      message: "Complete a library sync before processing new music."
    };
  }

  if (!previousSync) {
    return {
      latestSyncId: latestSync.id,
      previousSyncId: null,
      newTrackCount: 0,
      canProcess: false,
      message: "Run another sync later to detect new songs since the first sync."
    };
  }

  const [latestTrackIds, previousTrackIds] = await Promise.all([
    input.store.listOwnedTrackIdsForSync({
      userId: input.userId,
      syncId: latestSync.id
    }),
    input.store.listOwnedTrackIdsForSync({
      userId: input.userId,
      syncId: previousSync.id
    })
  ]);
  const previousTrackIdSet = new Set(previousTrackIds);
  const newTrackCount = latestTrackIds.filter((trackId) => !previousTrackIdSet.has(trackId)).length;

  if (newTrackCount === 0) {
    return {
      latestSyncId: latestSync.id,
      previousSyncId: previousSync.id,
      newTrackCount,
      canProcess: false,
      message: "No new songs detected since the previous sync."
    };
  }

  if (input.store.listPlaylistRecipesForNewMusic) {
    const playlistRecipes = await input.store.listPlaylistRecipesForNewMusic({
      userId: input.userId
    });
    const pendingPlaylistCount = filterPendingNewMusicPlaylistRecipes(
      playlistRecipes,
      latestSync.id
    ).length;

    if (playlistRecipes.length === 0) {
      return {
        latestSyncId: latestSync.id,
        previousSyncId: previousSync.id,
        newTrackCount,
        canProcess: false,
        message: "Create saved playlists with recipes before processing new music."
      };
    }

    if (pendingPlaylistCount === 0) {
      return {
        latestSyncId: latestSync.id,
        previousSyncId: previousSync.id,
        newTrackCount,
        canProcess: false,
        message:
          "New songs from the latest sync have already been processed for your saved playlists."
      };
    }
  }

  return {
    latestSyncId: latestSync.id,
    previousSyncId: previousSync.id,
    newTrackCount,
    canProcess: true,
    message: `${newTrackCount} new song${newTrackCount === 1 ? "" : "s"} detected since the previous sync.`
  };
}

export async function processNewMusic(input: {
  store: NewMusicStore;
  userId: string;
}): Promise<ProcessNewMusicResult> {
  const summary = await getNewMusicSummary(input);

  if (!summary.canProcess || !summary.latestSyncId || !summary.previousSyncId) {
    return {
      status: "not_ready",
      summary,
      message: summary.message,
      recommendations: []
    };
  }

  if (
    !input.store.listPlaylistRecipesForNewMusic ||
    !input.store.listTracksByIds ||
    !input.store.listClassificationsByTrackIds
  ) {
    return {
      status: "not_ready",
      summary,
      message: "New-music recommendations are not configured in this environment.",
      recommendations: []
    };
  }

  const [latestTrackIds, previousTrackIds, allPlaylistRecipes] = await Promise.all([
    input.store.listOwnedTrackIdsForSync({
      userId: input.userId,
      syncId: summary.latestSyncId
    }),
    input.store.listOwnedTrackIdsForSync({
      userId: input.userId,
      syncId: summary.previousSyncId
    }),
    input.store.listPlaylistRecipesForNewMusic({
      userId: input.userId
    })
  ]);

  if (allPlaylistRecipes.length === 0) {
    return {
      status: "no_playlists",
      summary,
      message: "Create saved playlists with recipes before processing new music.",
      recommendations: []
    };
  }

  const playlistRecipes = filterPendingNewMusicPlaylistRecipes(
    allPlaylistRecipes,
    summary.latestSyncId
  );

  if (playlistRecipes.length === 0) {
    return {
      status: "not_ready",
      summary: {
        ...summary,
        canProcess: false,
        message:
          "New songs from the latest sync have already been processed for your saved playlists."
      },
      message: "New songs from the latest sync have already been processed for your saved playlists.",
      recommendations: []
    };
  }

  const previousTrackIdSet = new Set(previousTrackIds);
  const newTrackIds = latestTrackIds.filter((trackId) => !previousTrackIdSet.has(trackId));
  const tracks = await input.store.listTracksByIds({ normalizedTrackIds: newTrackIds });
  const classifications = await input.store.listClassificationsByTrackIds({
    normalizedTrackIds: tracks.map((track) => track.id)
  });
  const recommendations = createNewMusicRecommendations({
    playlistRecipes,
    tracks,
    classifications
  });

  if (recommendations.length === 0) {
    await markProcessedIfConfigured({
      store: input.store,
      userId: input.userId,
      playlistIds: playlistRecipes.map((item) => item.playlist.id),
      syncId: summary.latestSyncId
    });

    return {
      status: "no_matches",
      summary,
      message: "No saved playlist recipes matched the newly synced songs.",
      recommendations: []
    };
  }

  await input.store.storeNewMusicGenerations?.({
    userId: input.userId,
    syncId: summary.latestSyncId,
    playlistRecipes,
    recommendations
  });

  await markProcessedIfConfigured({
    store: input.store,
    userId: input.userId,
    playlistIds: playlistRecipes.map((item) => item.playlist.id),
    syncId: summary.latestSyncId
  });

  return {
    status: "processed",
    summary,
    recommendations
  };
}

export function createNewMusicRecommendations(input: {
  playlistRecipes: NewMusicPlaylistRecipe[];
  tracks: NormalizedTrack[];
  classifications: NewMusicTrackClassification[];
}): NewMusicPlaylistRecommendation[] {
  if (input.playlistRecipes.length === 0 || input.tracks.length === 0) {
    return [];
  }

  const fingerprintByTrackId = new Map(input.tracks.map((track) => [track.id, track.fingerprint]));
  const trackById = new Map(input.tracks.map((track) => [track.id, track]));
  const playlistByRecipeId = new Map(
    input.playlistRecipes.map((item) => [item.recipe.id, item.playlist])
  );
  const generated = generateRecipePlaylists({
    recipes: input.playlistRecipes.map((item) => item.recipe),
    tracks: input.tracks,
    classifications: input.classifications.map((classification) => ({
      ...classification,
      fingerprint:
        classification.fingerprint ||
        fingerprintByTrackId.get(classification.normalizedTrackId) ||
        classification.fingerprint
    }))
  });

  return generated
    .flatMap((playlistPlan, index) => {
      const recipe = input.playlistRecipes[index]?.recipe ?? null;
      const playlist = recipe ? playlistByRecipeId.get(recipe.id) : null;

      if (!recipe || !playlist || playlistPlan.tracks.length === 0) {
        return [];
      }

      return [
        {
          playlistId: playlist.id,
          playlistName: playlist.name,
          recipeId: recipe.id,
          recipeName: recipe.name,
          trackCount: playlistPlan.tracks.length,
          tracks: playlistPlan.tracks
            .map((track) => mapNewMusicTrack(track, trackById))
            .filter((track): track is NewMusicRecommendationTrack => Boolean(track))
        }
      ];
    })
    .filter((recommendation) => recommendation.tracks.length > 0);
}

export function createSupabaseNewMusicStore(supabase: SupabaseClient): NewMusicStore {
  return {
    async listRecentCompletedSyncs(input) {
      const { data, error } = await supabase
        .from("library_syncs")
        .select("id,created_at")
        .eq("user_id", input.userId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(input.limit);

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to load completed library syncs.");
      }

      return (data as LibrarySyncRow[]).map((sync) => ({
        id: sync.id,
        createdAt: sync.created_at
      }));
    },

    async listOwnedTrackIdsForSync(input) {
      const { data, error } = await supabase
        .from("track_ownership")
        .select("normalized_track_id")
        .eq("user_id", input.userId)
        .eq("sync_id", input.syncId);

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to load synced track ownership.");
      }

      return (data as TrackOwnershipRow[]).map((track) => track.normalized_track_id);
    },

    async listPlaylistRecipesForNewMusic(input) {
      const playlistStore = createSupabasePlaylistStore(supabase);
      const recipeStore = createSupabasePlaylistRecipeStore(supabase);
      const playlists = await playlistStore.listPlaylists({
        userId: input.userId
      });
      const recipesByPlaylist = await Promise.all(
        playlists.map(async (playlist) => ({
          playlist,
          recipes: await recipeStore.listRecipesForPlaylist({
            userId: input.userId,
            playlistId: playlist.id
          })
        }))
      );

      return recipesByPlaylist.flatMap(({ playlist, recipes }) =>
        recipes.slice(0, 1).map((recipe) => ({
          playlist,
          recipe
        }))
      );
    },

    async listTracksByIds(input) {
      if (input.normalizedTrackIds.length === 0) {
        return [];
      }

      return listNormalizedTracksByIds(supabase, input.normalizedTrackIds);
    },

    async listClassificationsByTrackIds(input) {
      return createSupabasePreviewSnapshotStore(supabase).listClassificationsForPreview(input);
    },

    async markNewMusicProcessed(input) {
      if (input.playlistIds.length === 0) {
        return;
      }

      const { error } = await supabase
        .from("playlists")
        .update({
          last_processed_new_music_sync_id: input.syncId,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", input.userId)
        .neq("status", "archived")
        .in("id", input.playlistIds);

      if (error) {
        throw new Error(error.message);
      }
    },

    async storeNewMusicGenerations(input) {
      if (input.recommendations.length === 0) {
        return;
      }

      const recipeById = new Map(input.playlistRecipes.map((item) => [item.recipe.id, item.recipe]));
      const generatedAt = new Date().toISOString();

      await Promise.all(
        input.recommendations.map(async (recommendation) => {
          const recipe = recipeById.get(recommendation.recipeId) ?? null;
          const { data: generation, error: generationError } = await supabase
            .from("playlist_generations")
            .insert({
              user_id: input.userId,
              playlist_id: recommendation.playlistId,
              recipe_id: recommendation.recipeId,
              sort_run_id: null,
              library_sync_id: input.syncId,
              status: "ready_for_review",
              recipe_snapshot: {
                source: "new_music",
                recipeId: recommendation.recipeId,
                recipeName: recommendation.recipeName,
                playlistNote: recipe?.playlistNote ?? null,
                tags: recipe?.tags ?? [],
                targetTrackMin: recipe?.targetTrackMin ?? null,
                targetTrackMax: recipe?.targetTrackMax ?? null,
                newTrackCount: recommendation.trackCount
              },
              generated_at: generatedAt
            })
            .select("id")
            .single();

          if (generationError || !generation) {
            throw new Error(generationError?.message ?? "Unable to store new-music generation.");
          }

          const { error: tracksError } = await supabase.from("playlist_generation_tracks").insert(
            recommendation.tracks.map((track, position) => ({
              generation_id: (generation as { id: string }).id,
              normalized_track_id: track.normalizedTrackId,
              position,
              score: track.score,
              reason: track.reason,
              decision: "keep"
            }))
          );

          if (tracksError) {
            throw new Error(tracksError.message);
          }

          const { error: playlistError } = await supabase
            .from("playlists")
            .update({
              status: "active",
              latest_library_sync_id: input.syncId,
              last_generated_at: generatedAt,
              updated_at: generatedAt
            })
            .eq("id", recommendation.playlistId)
            .eq("user_id", input.userId)
            .neq("status", "archived");

          if (playlistError) {
            throw new Error(playlistError.message);
          }
        })
      );
    }
  };
}

async function listNormalizedTracksByIds(
  supabase: SupabaseClient,
  normalizedTrackIds: string[]
): Promise<NormalizedTrack[]> {
  const { data, error } = await supabase
    .from("tracks_normalized")
    .select(
      "id,apple_song_id,isrc,name,artist_name,album_name,normalized_name,normalized_artist,normalized_album,fingerprint,duration_in_millis,genre_names,content_rating"
    )
    .in("id", normalizedTrackIds);

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to load new music tracks.");
  }

  return (data as NormalizedTrackRow[]).map((track) => ({
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
}

function mapNewMusicTrack(
  track: GeneratedPlaylistTrack,
  trackById: Map<string, NormalizedTrack>
): NewMusicRecommendationTrack | null {
  if (!track.normalizedTrackId) {
    return null;
  }

  const normalizedTrack = trackById.get(track.normalizedTrackId);

  if (!normalizedTrack) {
    return null;
  }

  return {
    normalizedTrackId: normalizedTrack.id,
    appleSongId: normalizedTrack.appleSongId ?? null,
    name: normalizedTrack.name,
    artistName: normalizedTrack.artistName,
    albumName: normalizedTrack.albumName ?? null,
    score: track.score,
    reason: track.reason
  };
}

function filterPendingNewMusicPlaylistRecipes(
  playlistRecipes: NewMusicPlaylistRecipe[],
  latestSyncId: string
) {
  return playlistRecipes.filter(
    (item) => item.playlist.lastProcessedNewMusicSyncId !== latestSyncId
  );
}

async function markProcessedIfConfigured(input: {
  store: NewMusicStore;
  userId: string;
  playlistIds: string[];
  syncId: string;
}) {
  if (!input.store.markNewMusicProcessed) {
    return;
  }

  await input.store.markNewMusicProcessed({
    userId: input.userId,
    playlistIds: input.playlistIds,
    syncId: input.syncId
  });
}
