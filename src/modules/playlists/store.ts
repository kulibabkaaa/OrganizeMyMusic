import type { SupabaseClient } from "@supabase/supabase-js";

import {
  playlistCreateSchema,
  playlistUpdateSchema,
  type PlaylistCreateInput,
  type PlaylistUpdateInput
} from "@/modules/playlists/schema";
import type { PersistentPlaylist, PlaylistStatus, SortSourceProvider } from "@/types/domain";

type PlaylistRow = {
  id: string;
  user_id: string;
  source_provider: SortSourceProvider;
  name: string;
  description: string | null;
  status: PlaylistStatus;
  apple_playlist_id: string | null;
  created_from_sort_run_id: string | null;
  latest_library_sync_id: string | null;
  last_generated_at: string | null;
  last_exported_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export interface PlaylistStore {
  listPlaylists(input: { userId: string; includeArchived?: boolean }): Promise<PersistentPlaylist[]>;
  getPlaylist(input: { userId: string; playlistId: string }): Promise<PersistentPlaylist | null>;
  createPlaylist(input: {
    userId: string;
    playlist: PlaylistCreateInput;
  }): Promise<PersistentPlaylist>;
  updatePlaylist(input: {
    userId: string;
    playlistId: string;
    values: PlaylistUpdateInput;
  }): Promise<PersistentPlaylist | null>;
  archivePlaylist(input: { userId: string; playlistId: string }): Promise<PersistentPlaylist | null>;
}

export function createSupabasePlaylistStore(supabase: SupabaseClient): PlaylistStore {
  return {
    async listPlaylists(input) {
      let query = supabase
        .from("playlists")
        .select(playlistSelect)
        .eq("user_id", input.userId)
        .order("updated_at", { ascending: false });

      if (!input.includeArchived) {
        query = query.neq("status", "archived");
      }

      const { data, error } = await query;

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to load playlists.");
      }

      return (data as PlaylistRow[]).map(mapPlaylistRow);
    },

    async getPlaylist(input) {
      const { data, error } = await supabase
        .from("playlists")
        .select(playlistSelect)
        .eq("id", input.playlistId)
        .eq("user_id", input.userId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data ? mapPlaylistRow(data as PlaylistRow) : null;
    },

    async createPlaylist(input) {
      const playlist = playlistCreateSchema.parse(input.playlist);
      const { data, error } = await supabase
        .from("playlists")
        .insert({
          user_id: input.userId,
          source_provider: playlist.sourceProvider,
          name: playlist.name,
          description: playlist.description,
          status: "draft",
          created_from_sort_run_id: playlist.createdFromSortRunId ?? null,
          latest_library_sync_id: playlist.latestLibrarySyncId ?? null
        })
        .select(playlistSelect)
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Unable to create playlist.");
      }

      return mapPlaylistRow(data as PlaylistRow);
    },

    async updatePlaylist(input) {
      const values = playlistUpdateSchema.parse(input.values);
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if ("name" in values) patch.name = values.name;
      if ("description" in values) patch.description = values.description;
      if ("status" in values) patch.status = values.status;
      if ("applePlaylistId" in values) patch.apple_playlist_id = values.applePlaylistId;
      if ("latestLibrarySyncId" in values) patch.latest_library_sync_id = values.latestLibrarySyncId;
      if ("lastGeneratedAt" in values) patch.last_generated_at = values.lastGeneratedAt;
      if ("lastExportedAt" in values) patch.last_exported_at = values.lastExportedAt;

      if (values.status === "archived") {
        patch.archived_at = new Date().toISOString();
      } else if (values.status) {
        patch.archived_at = null;
      }

      const { data, error } = await supabase
        .from("playlists")
        .update(patch)
        .eq("id", input.playlistId)
        .eq("user_id", input.userId)
        .select(playlistSelect)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data ? mapPlaylistRow(data as PlaylistRow) : null;
    },

    async archivePlaylist(input) {
      return this.updatePlaylist({
        userId: input.userId,
        playlistId: input.playlistId,
        values: { status: "archived" }
      });
    }
  };
}

export const playlistSelect =
  "id,user_id,source_provider,name,description,status,apple_playlist_id,created_from_sort_run_id,latest_library_sync_id,last_generated_at,last_exported_at,created_at,updated_at,archived_at";

export function mapPlaylistRow(row: PlaylistRow): PersistentPlaylist {
  return {
    id: row.id,
    userId: row.user_id,
    sourceProvider: row.source_provider,
    name: row.name,
    description: row.description,
    status: row.status,
    applePlaylistId: row.apple_playlist_id,
    createdFromSortRunId: row.created_from_sort_run_id,
    latestLibrarySyncId: row.latest_library_sync_id,
    lastGeneratedAt: row.last_generated_at,
    lastExportedAt: row.last_exported_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at
  };
}
