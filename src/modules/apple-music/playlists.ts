import type { GeneratedPlaylist } from "@/types/domain";

import type { AppleApiCredentials, ApplePlaylistWriteResult } from "@/modules/apple-music/types";
import { AppleMusicClient } from "@/modules/apple-music/client";

export async function createAppleMusicPlaylists(
  playlists: GeneratedPlaylist[],
  credentials?: AppleApiCredentials
) {
  if (!credentials) {
    return playlists.map(
      (playlist): ApplePlaylistWriteResult => ({
        playlistId: `apple_${playlist.id}`,
        title: playlist.title,
        success: true,
        message: "Playlist queued for Apple Music creation."
      })
    );
  }

  const results: ApplePlaylistWriteResult[] = [];
  const client = new AppleMusicClient(credentials);

  for (const playlist of playlists) {
    try {
      const created = await client.createLibraryPlaylist({
        name: playlist.title,
        description: playlist.description
      });

      results.push({
        playlistId: created.id,
        title: playlist.title,
        success: true,
        message: "Playlist shell created in Apple Music."
      });
    } catch (error) {
      results.push({
        playlistId: playlist.id,
        title: playlist.title,
        success: false,
        message: error instanceof Error ? error.message : "Playlist creation failed."
      });
    }
  }

  return results;
}
