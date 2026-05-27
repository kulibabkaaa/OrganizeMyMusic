import type { SupabaseClient } from "@supabase/supabase-js";

import {
  playlistRecipeCreateSchema,
  playlistRecipeUpdateSchema,
  type PlaylistRecipeCreateInput,
  type PlaylistRecipeUpdateInput
} from "@/modules/playlist-recipes/schema";
import type {
  PlaylistRecipe,
  PlaylistRecipeDuplicatePolicy,
  PlaylistRecipeTag
} from "@/types/domain";

type PlaylistRecipeRow = {
  id: string;
  user_id: string;
  sort_run_id: string;
  position: number;
  name: string;
  playlist_note: string | null;
  target_track_min: number | null;
  target_track_max: number | null;
  duplicate_policy: PlaylistRecipeDuplicatePolicy;
  allow_explicit: boolean;
  include_library_only: boolean;
  tags: PlaylistRecipeTag[];
  created_at: string;
  updated_at: string;
};

export interface PlaylistRecipeStore {
  listRecipesForSort(input: { userId: string; sortRunId: string }): Promise<PlaylistRecipe[]>;
  createRecipe(input: { userId: string; recipe: PlaylistRecipeCreateInput }): Promise<PlaylistRecipe>;
  updateRecipe(input: {
    userId: string;
    recipeId: string;
    values: PlaylistRecipeUpdateInput;
  }): Promise<PlaylistRecipe | null>;
  deleteRecipe(input: { userId: string; recipeId: string }): Promise<boolean>;
  reorderRecipes(input: {
    userId: string;
    sortRunId: string;
    positions: Array<{ id: string; position: number }>;
  }): Promise<PlaylistRecipe[]>;
}

export function createSupabasePlaylistRecipeStore(
  supabase: SupabaseClient
): PlaylistRecipeStore {
  return {
    async listRecipesForSort(input) {
      const { data, error } = await supabase
        .from("playlist_recipes")
        .select(
          "id,user_id,sort_run_id,position,name,playlist_note,target_track_min,target_track_max,duplicate_policy,allow_explicit,include_library_only,tags,created_at,updated_at"
        )
        .eq("user_id", input.userId)
        .eq("sort_run_id", input.sortRunId)
        .order("position", { ascending: true });

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to load Playlist Recipes.");
      }

      return (data as PlaylistRecipeRow[]).map(mapPlaylistRecipeRow);
    },

    async createRecipe(input) {
      const recipe = playlistRecipeCreateSchema.parse(input.recipe);
      const { data, error } = await supabase
        .from("playlist_recipes")
        .insert({
          user_id: input.userId,
          sort_run_id: recipe.sortRunId,
          position: recipe.position,
          name: recipe.name,
          playlist_note: recipe.playlistNote,
          target_track_min: recipe.targetTrackMin,
          target_track_max: recipe.targetTrackMax,
          duplicate_policy: recipe.duplicatePolicy,
          allow_explicit: recipe.allowExplicit,
          include_library_only: recipe.includeLibraryOnly,
          tags: recipe.tags
        })
        .select(
          "id,user_id,sort_run_id,position,name,playlist_note,target_track_min,target_track_max,duplicate_policy,allow_explicit,include_library_only,tags,created_at,updated_at"
        )
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to create Playlist Recipe.");
      }

      return mapPlaylistRecipeRow(data as PlaylistRecipeRow);
    },

    async updateRecipe(input) {
      const values = playlistRecipeUpdateSchema.parse(input.values);
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if ("position" in values) patch.position = values.position;
      if ("name" in values) patch.name = values.name;
      if ("playlistNote" in values) patch.playlist_note = values.playlistNote;
      if ("targetTrackMin" in values) patch.target_track_min = values.targetTrackMin;
      if ("targetTrackMax" in values) patch.target_track_max = values.targetTrackMax;
      if ("duplicatePolicy" in values) patch.duplicate_policy = values.duplicatePolicy;
      if ("allowExplicit" in values) patch.allow_explicit = values.allowExplicit;
      if ("includeLibraryOnly" in values) patch.include_library_only = values.includeLibraryOnly;
      if ("tags" in values) patch.tags = values.tags;

      const { data, error } = await supabase
        .from("playlist_recipes")
        .update(patch)
        .eq("id", input.recipeId)
        .eq("user_id", input.userId)
        .select(
          "id,user_id,sort_run_id,position,name,playlist_note,target_track_min,target_track_max,duplicate_policy,allow_explicit,include_library_only,tags,created_at,updated_at"
        )
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data ? mapPlaylistRecipeRow(data as PlaylistRecipeRow) : null;
    },

    async deleteRecipe(input) {
      const { error } = await supabase
        .from("playlist_recipes")
        .delete()
        .eq("id", input.recipeId)
        .eq("user_id", input.userId);

      if (error) {
        throw new Error(error.message);
      }

      return true;
    },

    async reorderRecipes(input) {
      const results = await Promise.all(
        input.positions.map((recipe) =>
          supabase
            .from("playlist_recipes")
            .update({
              position: recipe.position,
              updated_at: new Date().toISOString()
            })
            .eq("id", recipe.id)
            .eq("user_id", input.userId)
            .eq("sort_run_id", input.sortRunId)
        )
      );

      const error = results.find((result) => result.error)?.error;

      if (error) {
        throw new Error(error.message);
      }

      return this.listRecipesForSort({
        userId: input.userId,
        sortRunId: input.sortRunId
      });
    }
  };
}

function mapPlaylistRecipeRow(row: PlaylistRecipeRow): PlaylistRecipe {
  return {
    id: row.id,
    userId: row.user_id,
    sortRunId: row.sort_run_id,
    position: row.position,
    name: row.name,
    playlistNote: row.playlist_note,
    targetTrackMin: row.target_track_min,
    targetTrackMax: row.target_track_max,
    duplicatePolicy: row.duplicate_policy,
    allowExplicit: row.allow_explicit,
    includeLibraryOnly: row.include_library_only,
    tags: row.tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
