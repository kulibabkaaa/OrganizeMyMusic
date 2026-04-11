import { logger } from "@/lib/logger";
import type { RawAppleTrack } from "@/types/domain";
import type { AppleApiCredentials } from "@/modules/apple-music/types";

const APPLE_API_ROOT = "https://api.music.apple.com/v1";

interface AppleCollectionResponse<T> {
  data: T[];
  next?: string;
}

interface AppleLibrarySongResource {
  id: string;
  attributes?: {
    name: string;
    artistName: string;
    albumName?: string;
    durationInMillis?: number;
    genreNames?: string[];
    contentRating?: "clean" | "explicit";
    isrc?: string;
  };
}

async function appleRequest<T>(
  path: string,
  credentials: AppleApiCredentials,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(path.startsWith("http") ? path : `${APPLE_API_ROOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${credentials.developerToken}`,
      "Music-User-Token": credentials.musicUserToken,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apple Music API request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
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

export async function fetchAppleLibrarySongs(
  credentials?: AppleApiCredentials
): Promise<RawAppleTrack[]> {
  if (credentials) {
    const tracks: RawAppleTrack[] = [];
    let nextPath: string | undefined = "/me/library/songs?limit=100";

    while (nextPath) {
      const page: AppleCollectionResponse<AppleLibrarySongResource> =
        await appleRequest<AppleCollectionResponse<AppleLibrarySongResource>>(
          nextPath,
          credentials
        );
      tracks.push(...page.data.map(mapLibrarySong));
      nextPath = page.next;
    }

    return tracks;
  }

  logger.info("Using fixture library songs until Apple Music credentials are configured.");

  const fixture: RawAppleTrack[] = [
    {
      id: "track_1",
      name: "Midnight City",
      artistName: "M83",
      albumName: "Hurry Up, We're Dreaming",
      genreNames: ["Electronic", "Alternative"],
      durationInMillis: 244000
    },
    {
      id: "track_2",
      name: "Blinding Lights",
      artistName: "The Weeknd",
      albumName: "After Hours",
      genreNames: ["Pop"],
      durationInMillis: 200040
    },
    {
      id: "track_3",
      name: "La Cancion",
      artistName: "J Balvin",
      albumName: "Oasis",
      genreNames: ["Latin"],
      durationInMillis: 243000
    }
  ];

  return fixture;
}
