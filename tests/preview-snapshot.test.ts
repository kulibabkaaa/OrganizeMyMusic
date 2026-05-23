import { describe, expect, it, vi } from "vitest";

import { parsePlaylistRequestLines } from "@/modules/playlist-requests/parser";
import {
  generateAndStorePreviewSnapshot,
  type PreviewSnapshotStore
} from "@/modules/sorts/preview-snapshot";
import type { NormalizedTrack, TrackClassification } from "@/types/domain";

function createTrack(input: {
  id: string;
  name: string;
  artistName: string;
  language: TrackClassification["language"];
  genre: TrackClassification["genre"];
  moods: TrackClassification["moods"];
  energy: number;
  contentRating?: NormalizedTrack["contentRating"];
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
    contentRating: input.contentRating
  };
  const classification: TrackClassification & { normalizedTrackId: string } = {
    normalizedTrackId: input.id,
    fingerprint: track.fingerprint,
    language: input.language,
    genre: input.genre,
    subgenres: input.genre === "Hip-Hop/Rap" ? ["rap"] : [],
    moods: input.moods,
    energy: input.energy,
    confidence: 0.9,
    source: "metadata",
    version: 1,
    metadataHash: `hash_${input.id}`
  };

  return { track, classification };
}

function createStore(overrides: Partial<PreviewSnapshotStore> = {}) {
  const ukrainianRap = createTrack({
    id: "track_1",
    name: "Kyiv Bars",
    artistName: "Artist A",
    language: "ukrainian",
    genre: "Hip-Hop/Rap",
    moods: ["Hype"],
    energy: 0.78
  });
  const gymRap = createTrack({
    id: "track_2",
    name: "Lift",
    artistName: "Artist B",
    language: "english",
    genre: "Hip-Hop/Rap",
    moods: ["Workout", "Hype"],
    energy: 0.88
  });
  const savePreviewSnapshot = vi.fn(async (input) => input.snapshot);
  const store: PreviewSnapshotStore = {
    async getSortRunForPreview() {
      return {
        id: "sort_1",
        userId: "user_1",
        librarySyncId: "sync_1",
        state: "draft",
        paymentStatus: "pending",
        previewSnapshot: null,
        requests: parsePlaylistRequestLines(["Ukrainian rap", "Gym rap"])
      };
    },
    async listTracksForPreview() {
      return [ukrainianRap.track, gymRap.track];
    },
    async listClassificationsForPreview() {
      return [ukrainianRap.classification, gymRap.classification];
    },
    savePreviewSnapshot
  };

  return Object.assign(store, overrides);
}

describe("generateAndStorePreviewSnapshot", () => {
  it("stores an immutable preview snapshot with playlist and track details", async () => {
    const store = createStore();

    await expect(
      generateAndStorePreviewSnapshot({
        store,
        sortRunId: "sort_1",
        userId: "user_1",
        now: () => "2026-05-22T20:00:00.000Z"
      })
    ).resolves.toMatchObject({
      status: "created",
      snapshot: {
        sortRunId: "sort_1",
        librarySyncId: "sync_1",
        generatedAt: "2026-05-22T20:00:00.000Z",
        playlists: [
          expect.objectContaining({
            title: "Ukrainian Rap",
            trackCount: 1,
            tracks: [
              expect.objectContaining({
                normalizedTrackId: "track_1",
                name: "Kyiv Bars",
                artistName: "Artist A",
                score: expect.any(Number),
                reason: expect.stringContaining("language")
              })
            ]
          }),
          expect.objectContaining({
            title: "Gym Rap",
            tracks: expect.arrayContaining([
              expect.objectContaining({
                normalizedTrackId: "track_2",
                reason: expect.stringContaining("energy")
              })
            ])
          })
        ]
      }
    });
    expect(store.savePreviewSnapshot).toHaveBeenCalledOnce();
  });

  it("does not overwrite a snapshot once payment or confirmation has started", async () => {
    const store = createStore({
      async getSortRunForPreview() {
        return {
          id: "sort_1",
          userId: "user_1",
          librarySyncId: "sync_1",
          state: "paid",
          paymentStatus: "paid",
          previewSnapshot: {
            sortRunId: "sort_1",
            librarySyncId: "sync_1",
            generatedAt: "2026-05-22T19:00:00.000Z",
            playlists: []
          },
          requests: parsePlaylistRequestLines(["Ukrainian rap", "Gym rap"])
        };
      }
    });

    await expect(
      generateAndStorePreviewSnapshot({
        store,
        sortRunId: "sort_1",
        userId: "user_1"
      })
    ).resolves.toEqual({
      status: "immutable",
      snapshot: {
        sortRunId: "sort_1",
        librarySyncId: "sync_1",
        generatedAt: "2026-05-22T19:00:00.000Z",
        playlists: []
      }
    });
    expect(store.savePreviewSnapshot).not.toHaveBeenCalled();
  });
});
