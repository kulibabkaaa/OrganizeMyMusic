import { describe, expect, it, vi } from "vitest";

import {
  AppleMusicApiError,
  AppleMusicClient,
  fetchAppleLibrarySongs
} from "@/modules/apple-music/client";

const credentials = {
  developerToken: "developer-token",
  musicUserToken: "music-user-token"
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
}

describe("AppleMusicClient", () => {
  it("fetches all library songs through Apple pagination", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: "i.first",
              type: "library-songs",
              attributes: { name: "First", artistName: "Artist A" }
            }
          ],
          next: "/v1/me/library/songs?offset=1"
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: "i.second",
              type: "library-songs",
              attributes: { name: "Second", artistName: "Artist B" }
            }
          ]
        })
      );

    const client = new AppleMusicClient({ ...credentials, fetcher });
    const songs = await client.getAllLibrarySongs({ limit: 1 });
    const firstHeaders = fetcher.mock.calls[0]?.[1]?.headers as Headers;

    expect(songs.map((song) => song.id)).toEqual(["i.first", "i.second"]);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://api.music.apple.com/v1/me/library/songs?limit=1"
    );
    expect(firstHeaders.get("Authorization")).toBe("Bearer developer-token");
    expect(firstHeaders.get("Music-User-Token")).toBe("music-user-token");
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://api.music.apple.com/v1/me/library/songs?offset=1",
      expect.any(Object)
    );
  });

  it("creates a library playlist and adds library songs", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            data: [{ id: "p.created", type: "library-playlists" }]
          },
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const client = new AppleMusicClient({ ...credentials, fetcher });

    const playlist = await client.createLibraryPlaylist({
      name: "Ukrainian Rap",
      description: "Confirmed tracks"
    });
    await client.addTracksToLibraryPlaylist({
      playlistId: playlist.id,
      tracks: [{ id: "i.song", type: "library-songs" }]
    });

    expect(playlist.id).toBe("p.created");
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      attributes: {
        name: "Ukrainian Rap",
        description: "Confirmed tracks"
      }
    });
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      "https://api.music.apple.com/v1/me/library/playlists/p.created/tracks"
    );
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({
      data: [{ id: "i.song", type: "library-songs" }]
    });
  });

  it("retries retryable Apple Music failures", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ errors: [{ title: "Busy" }] }, { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));

    const client = new AppleMusicClient({ ...credentials, fetcher, maxRetries: 1 });

    await expect(client.getAllLibrarySongs()).resolves.toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-idempotent playlist creation failures", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ errors: [{ title: "Busy" }] }, { status: 500 }));

    const client = new AppleMusicClient({ ...credentials, fetcher, maxRetries: 2 });

    await expect(client.createLibraryPlaylist({ name: "No duplicates" })).rejects.toMatchObject({
      status: 500,
      retryable: true
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("normalizes Apple Music API errors", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse(
        {
          errors: [
            {
              code: "40101",
              title: "Unauthorized",
              detail: "The music user token is invalid."
            }
          ]
        },
        { status: 401 }
      )
    );

    const client = new AppleMusicClient({ ...credentials, fetcher });

    await expect(client.getAllLibrarySongs()).rejects.toMatchObject({
      status: 401,
      code: "40101",
      detail: "The music user token is invalid.",
      retryable: false
    });
    await expect(client.getAllLibrarySongs()).rejects.toBeInstanceOf(AppleMusicApiError);
  });
});

describe("fetchAppleLibrarySongs", () => {
  it("maps Apple library song resources to raw tracks", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse({
        data: [
          {
            id: "i.raw",
            type: "library-songs",
            attributes: {
              name: "Song",
              artistName: "Artist",
              albumName: "Album",
              durationInMillis: 123000,
              genreNames: ["Hip-Hop/Rap"],
              contentRating: "explicit",
              isrc: "US123"
            }
          }
        ]
      })
    );

    await expect(fetchAppleLibrarySongs({ ...credentials, fetcher })).resolves.toEqual([
      {
        id: "i.raw",
        name: "Song",
        artistName: "Artist",
        albumName: "Album",
        durationInMillis: 123000,
        genreNames: ["Hip-Hop/Rap"],
        contentRating: "explicit",
        isrc: "US123"
      }
    ]);
  });
});
