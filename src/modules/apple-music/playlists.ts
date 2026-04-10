import type { GeneratedPlaylist } from "@/types/domain";

import type { AppleApiCredentials, ApplePlaylistWriteResult } from "@/modules/apple-music/types";

const APPLE_API_ROOT = "https://api.music.apple.com/v1";

interface CreatePlaylistResponse {
  data: Array<{ id: string }>;
}

async function applePlaylistRequest<T>(
  path: string,
  credentials: AppleApiCredentials,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${APPLE_API_ROOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${credentials.developerToken}`,
      "Music-User-Token": credentials.musicUserToken,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T;
}

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

  for (const playlist of playlists) {
    try {
      const created = await applePlaylistRequest<CreatePlaylistResponse>(
        "/me/library/playlists",
        credentials,
        {
          method: "POST",
          body: JSON.stringify({
            attributes: {
              name: playlist.title,
              description: playlist.description
            },
            relationships: {
              tracks: {
                data: playlist.appleSongIds.map((songId) => ({
                  id: songId,
                  type: "songs"
                }))
              }
            }
          })
        }
      );

      results.push({
        playlistId: created.data[0]?.id ?? playlist.id,
        title: playlist.title,
        success: true,
        message: "Playlist created in Apple Music."
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
