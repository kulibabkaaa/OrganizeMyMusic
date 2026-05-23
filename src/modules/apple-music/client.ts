import { logger } from "@/lib/logger";
import type { RawAppleTrack } from "@/types/domain";
import type { AppleApiCredentials } from "@/modules/apple-music/types";
import { z } from "zod";

const APPLE_API_ROOT = "https://api.music.apple.com/v1";

const appleApiErrorSchema = z.object({
  code: z.string().optional(),
  title: z.string().optional(),
  detail: z.string().optional()
}).passthrough();

const appleErrorsResponseSchema = z.object({
  errors: z.array(appleApiErrorSchema).optional()
}).passthrough();

const appleLibrarySongResourceSchema = z.object({
  id: z.string(),
  type: z.literal("library-songs").optional(),
  href: z.string().optional(),
  attributes: z.object({
    name: z.string().optional(),
    artistName: z.string().optional(),
    albumName: z.string().optional(),
    durationInMillis: z.number().optional(),
    genreNames: z.array(z.string()).optional(),
    contentRating: z.union([z.literal("clean"), z.literal("explicit")]).optional(),
    isrc: z.string().optional()
  }).passthrough().optional()
}).passthrough();

const appleLibrarySongsResponseSchema = z.object({
  data: z.array(appleLibrarySongResourceSchema),
  next: z.string().optional()
}).passthrough();

const appleLibraryPlaylistsResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    type: z.string().optional()
  }).passthrough())
}).passthrough();

export type AppleLibrarySongResource = z.infer<typeof appleLibrarySongResourceSchema>;
type AppleLibrarySongsResponse = z.infer<typeof appleLibrarySongsResponseSchema>;

export type AppleMusicTrackReferenceType =
  | "library-songs"
  | "songs"
  | "library-music-videos"
  | "music-videos";

export interface AppleMusicTrackReference {
  id: string;
  type: AppleMusicTrackReferenceType;
}

export interface AppleMusicClientOptions extends AppleApiCredentials {
  baseUrl?: string;
  fetcher?: typeof fetch;
  maxRetries?: number;
}

export interface GetLibrarySongsInput {
  limit?: number;
}

export interface CreateLibraryPlaylistInput {
  name: string;
  description?: string;
}

export interface AddTracksToPlaylistInput {
  playlistId: string;
  tracks: AppleMusicTrackReference[];
}

export class AppleMusicApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly detail?: string;
  readonly retryable: boolean;

  constructor(input: {
    status: number;
    title: string;
    code?: string;
    detail?: string;
    retryable: boolean;
  }) {
    super(input.detail ? `${input.title}: ${input.detail}` : input.title);
    this.name = "AppleMusicApiError";
    this.status = input.status;
    this.code = input.code;
    this.detail = input.detail;
    this.retryable = input.retryable;
  }
}

export class AppleMusicClient {
  private readonly baseUrl: string;
  private readonly credentials: AppleApiCredentials;
  private readonly fetcher: typeof fetch;
  private readonly maxRetries: number;

  constructor(options: AppleMusicClientOptions) {
    this.baseUrl = options.baseUrl ?? APPLE_API_ROOT;
    this.credentials = {
      developerToken: options.developerToken,
      musicUserToken: options.musicUserToken,
      storefront: options.storefront
    };
    this.fetcher = options.fetcher ?? fetch;
    this.maxRetries = options.maxRetries ?? 2;
  }

  async getAllLibrarySongs(input: GetLibrarySongsInput = {}): Promise<AppleLibrarySongResource[]> {
    const songs: AppleLibrarySongResource[] = [];
    let nextPath: string | undefined = this.librarySongsPath(input);

    while (nextPath) {
      const page: AppleLibrarySongsResponse = await this.request(
        nextPath,
        appleLibrarySongsResponseSchema
      );
      songs.push(...page.data);
      nextPath = page.next;
    }

    return songs;
  }

  async createLibraryPlaylist(input: CreateLibraryPlaylistInput): Promise<{ id: string }> {
    const response = await this.request("/me/library/playlists", appleLibraryPlaylistsResponseSchema, {
      method: "POST",
      body: JSON.stringify({
        attributes: {
          name: input.name,
          description: input.description
        }
      })
    });
    const created = response.data[0];

    if (!created) {
      throw new AppleMusicApiError({
        status: 502,
        title: "Apple Music returned no playlist.",
        retryable: false
      });
    }

    return { id: created.id };
  }

  async addTracksToLibraryPlaylist(input: AddTracksToPlaylistInput): Promise<void> {
    if (input.tracks.length === 0) {
      return;
    }

    await this.request(
      `/me/library/playlists/${encodeURIComponent(input.playlistId)}/tracks`,
      z.void(),
      {
        method: "POST",
        body: JSON.stringify({
          data: input.tracks.map((track) => ({
            id: track.id,
            type: track.type
          }))
        })
      }
    );
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    init: RequestInit = {}
  ): Promise<T> {
    let lastError: AppleMusicApiError | undefined;
    const method = init.method?.toUpperCase() ?? "GET";
    const canRetry = method === "GET";

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await this.fetcher(this.resolveUrl(path), {
          ...init,
          headers: this.headers(init.headers),
          cache: "no-store"
        });

        if (response.ok) {
          if (response.status === 204) {
            return schema.parse(undefined);
          }

          return schema.parse(await response.json());
        }

        lastError = await this.toApiError(response);
      } catch (error) {
        if (error instanceof AppleMusicApiError) {
          lastError = error;
        } else {
          lastError = new AppleMusicApiError({
            status: 0,
            title: "Apple Music request failed.",
            detail: error instanceof Error ? error.message : undefined,
            retryable: true
          });
        }
      }

      if (!canRetry || !lastError.retryable || attempt === this.maxRetries) {
        throw lastError;
      }
    }

    throw lastError;
  }

  private headers(initHeaders?: HeadersInit): Headers {
    const headers = new Headers(initHeaders);
    headers.set("Authorization", `Bearer ${this.credentials.developerToken}`);
    headers.set("Music-User-Token", this.credentials.musicUserToken);
    headers.set("Accept", "application/json");
    headers.set("Content-Type", "application/json");
    return headers;
  }

  private resolveUrl(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    const normalizedPath = path.startsWith("/v1/") ? path.slice(3) : path;
    return `${this.baseUrl}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
  }

  private librarySongsPath(input: GetLibrarySongsInput): string {
    const params = new URLSearchParams();

    if (input.limit) {
      params.set("limit", String(input.limit));
    }

    const query = params.toString();
    return query ? `/me/library/songs?${query}` : "/me/library/songs";
  }

  private async toApiError(response: Response): Promise<AppleMusicApiError> {
    const parsedBody = await this.parseErrorBody(response);
    const appleError = parsedBody.errors?.[0];

    return new AppleMusicApiError({
      status: response.status,
      code: appleError?.code,
      title: appleError?.title ?? `Apple Music API request failed with status ${response.status}.`,
      detail: appleError?.detail,
      retryable: response.status === 429 || response.status >= 500
    });
  }

  private async parseErrorBody(response: Response): Promise<z.infer<typeof appleErrorsResponseSchema>> {
    try {
      return appleErrorsResponseSchema.parse(await response.json());
    } catch {
      return {};
    }
  }
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
  credentials?: AppleMusicClientOptions
): Promise<RawAppleTrack[]> {
  if (credentials) {
    const client = new AppleMusicClient(credentials);
    return (await client.getAllLibrarySongs({ limit: 100 })).map(mapLibrarySong);
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
