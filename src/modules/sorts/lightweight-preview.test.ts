import { describe, expect, it, vi } from "vitest";

import {
  generateAndStoreLightweightPreview,
  type LightweightPreviewStore
} from "@/modules/sorts/lightweight-preview";
import type { NormalizedTrack, PlaylistRecipe, TrackClassification } from "@/types/domain";

function createTrack(input: {
  id: string;
  name: string;
  artistName: string;
  language: TrackClassification["language"];
  genre: TrackClassification["genre"];
  moods: TrackClassification["moods"];
  energy: number;
}) {
  const track: NormalizedTrack = {
    id: input.id,
    appleSongId: `apple_${input.id}`,
    name: input.name,
    artistName: input.artistName,
    albumName: "Album",
    normalizedName: input.name.toLowerCase(),
    normalizedArtist: input.artistName.toLowerCase(),
    normalizedAlbum: "album",
    fingerprint: `fp_${input.id}`,
    genreNames: [input.genre],
    contentRating: "clean"
  };
  const classification: TrackClassification & { normalizedTrackId: string } = {
    normalizedTrackId: input.id,
    fingerprint: track.fingerprint,
    language: input.language,
    genre: input.genre,
    subgenres: input.genre === "Hip-Hop/Rap" ? ["rap"] : [],
    moods: input.moods,
    energy: input.energy,
    confidence: 0.92,
    source: "metadata",
    version: 1,
    metadataHash: `hash_${input.id}`
  };

  return { track, classification };
}

function createRecipe(input: Partial<PlaylistRecipe> = {}): PlaylistRecipe {
  return {
    id: "recipe_1",
    userId: "user_1",
    sortRunId: "sort_1",
    position: 0,
    name: "Sad Ukrainian rap",
    playlistNote: "Late-night but not angry.",
    targetTrackMin: 15,
    targetTrackMax: 40,
    duplicatePolicy: "avoid_duplicates",
    allowExplicit: true,
    includeLibraryOnly: true,
    tags: [
      { id: "tag_language_ukrainian", category: "language", value: "Ukrainian" },
      { id: "tag_genre_rap", category: "genre", value: "rap" },
      { id: "tag_mood_sad", category: "mood", value: "Sad", note: "Slower and melancholic." }
    ],
    createdAt: "2026-05-26T10:00:00.000Z",
    updatedAt: "2026-05-26T10:00:00.000Z",
    ...input
  };
}

function createStore(overrides: Partial<LightweightPreviewStore> = {}) {
  const tracks = Array.from({ length: 12 }, (_, index) =>
    createTrack({
      id: `track_${index + 1}`,
      name: `Kyiv Night ${index + 1}`,
      artistName: `Artist ${index + 1}`,
      language: "ukrainian",
      genre: "Hip-Hop/Rap",
      moods: ["Sad", "Melancholy"],
      energy: 0.45
    })
  );
  const saveLightweightPreviewSnapshot = vi.fn(async (input) => input.snapshot);
  const store: LightweightPreviewStore = {
    async getSortRunForPreview() {
      return {
        id: "sort_1",
        userId: "user_1",
        librarySyncId: "sync_1",
        state: "draft",
        paymentStatus: "pending",
        previewSnapshot: null,
        requests: []
      };
    },
    async listRecipesForSort() {
      return [createRecipe()];
    },
    async listTracksForPreview() {
      return tracks.map((item) => item.track);
    },
    async listClassificationsForPreview() {
      return tracks.map((item) => item.classification);
    },
    saveLightweightPreviewSnapshot
  };

  return Object.assign(store, overrides);
}

describe("generateAndStoreLightweightPreview", () => {
  it("stores a lightweight preview from Playlist Recipes without creating full playlist rows", async () => {
    const store = createStore();

    await expect(
      generateAndStoreLightweightPreview({
        store,
        sortRunId: "sort_1",
        userId: "user_1",
        now: () => "2026-05-26T12:00:00.000Z"
      })
    ).resolves.toMatchObject({
      status: "created",
      snapshot: {
        sortRunId: "sort_1",
        librarySyncId: "sync_1",
        generatedAt: "2026-05-26T12:00:00.000Z",
        playlists: [
          {
            recipeId: "recipe_1",
            playlistName: "Sad Ukrainian rap",
            estimatedTrackCount: 12,
            confidenceLabel: "medium",
            fitLabel: "strong",
            lockedTrackCount: 9,
            tags: [
              { category: "language", value: "Ukrainian" },
              { category: "genre", value: "rap" },
              { category: "mood", value: "Sad", note: "Slower and melancholic." }
            ],
            sampleTracks: expect.arrayContaining([
              expect.objectContaining({
                name: "Kyiv Night 1",
                artistName: "Artist 1",
                reason: expect.stringContaining("Language matches ukrainian")
              })
            ])
          }
        ]
      }
    });
    expect(store.saveLightweightPreviewSnapshot).toHaveBeenCalledOnce();
  });

  it("does not regenerate once payment or confirmation has started", async () => {
    const store = createStore({
      async getSortRunForPreview() {
        return {
          id: "sort_1",
          userId: "user_1",
          librarySyncId: "sync_1",
          state: "draft",
          paymentStatus: "paid",
          previewSnapshot: null,
          requests: []
        };
      }
    });

    await expect(
      generateAndStoreLightweightPreview({
        store,
        sortRunId: "sort_1",
        userId: "user_1"
      })
    ).resolves.toEqual({
      status: "immutable",
      snapshot: null
    });
    expect(store.saveLightweightPreviewSnapshot).not.toHaveBeenCalled();
  });

  it("falls back to simple library samples when matching logic finds no tracks", async () => {
    const store = createStore({
      async listClassificationsForPreview() {
        return [];
      }
    });

    await expect(
      generateAndStoreLightweightPreview({
        store,
        sortRunId: "sort_1",
        userId: "user_1"
      })
    ).resolves.toMatchObject({
      status: "created",
      snapshot: {
        playlists: [
          {
            estimatedTrackCount: 3,
            lockedTrackCount: 0,
            qualityWarnings: expect.arrayContaining([
              "No tracks matched this playlist plan. Adjust tags before starting full organization.",
              "12 library tracks could not be scored because metadata is missing."
            ]),
            sampleTracks: [
              {
                name: "Kyiv Night 1",
                artistName: "Artist 1",
                reason: "Sample from your Apple Music library."
              },
              {
                name: "Kyiv Night 2",
                artistName: "Artist 2",
                reason: "Sample from your Apple Music library."
              },
              {
                name: "Kyiv Night 3",
                artistName: "Artist 3",
                reason: "Sample from your Apple Music library."
              }
            ]
          }
        ]
      }
    });
  });

  it("returns unsupported tag and low-confidence warnings for weak playlist plans", async () => {
    const weakTracks = [
      createTrack({
        id: "track_weak",
        name: "Weak Match",
        artistName: "Artist",
        language: "ukrainian",
        genre: "Hip-Hop/Rap",
        moods: ["Sad"],
        energy: 0.45
      })
    ];
    const store = createStore({
      async listRecipesForSort() {
        return [
          createRecipe({
            targetTrackMin: null,
            targetTrackMax: null,
            tags: [
              { id: "tag_genre_rap", category: "genre", value: "rap" },
              { id: "tag_era_2000s", category: "era", value: "2000s" }
            ]
          })
        ];
      },
      async listTracksForPreview() {
        return weakTracks.map((item) => item.track);
      },
      async listClassificationsForPreview() {
        return weakTracks.map((item) => ({
          ...item.classification,
          confidence: 0.5
        }));
      }
    });

    await expect(
      generateAndStoreLightweightPreview({
        store,
        sortRunId: "sort_1",
        userId: "user_1"
      })
    ).resolves.toMatchObject({
      status: "created",
      snapshot: {
        playlists: [
          {
            estimatedTrackCount: 1,
            confidenceLabel: "medium",
            qualityWarnings: [
              'Unsupported era tag "2000s" was ignored.',
              "Only 1 track matched this playlist plan.",
              "Top matches are low-confidence. Review the tags before starting full organization."
            ]
          }
        ]
      }
    });
  });

  it("returns recoverable statuses for missing syncs and empty recipes", async () => {
    await expect(
      generateAndStoreLightweightPreview({
        store: createStore({
          async getSortRunForPreview() {
            return {
              id: "sort_1",
              userId: "user_1",
              librarySyncId: null,
              state: "draft",
              paymentStatus: "pending",
              previewSnapshot: null,
              requests: []
            };
          }
        }),
        sortRunId: "sort_1",
        userId: "user_1"
      })
    ).resolves.toEqual({ status: "missing_library_sync" });

    await expect(
      generateAndStoreLightweightPreview({
        store: createStore({
          async listRecipesForSort() {
            return [];
          }
        }),
        sortRunId: "sort_1",
        userId: "user_1"
      })
    ).resolves.toEqual({ status: "empty_recipes" });
  });
});
