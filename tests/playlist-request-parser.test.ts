import { describe, expect, it } from "vitest";

import {
  createPlaylistRequestSortRun,
  parsePlaylistRequestLines,
  type PlaylistRequestStore
} from "@/modules/playlist-requests/parser";

function createStore(overrides: Partial<PlaylistRequestStore> = {}) {
  const store: PlaylistRequestStore = {
    async getCompletedLibrarySyncForUser() {
      return {
        id: "11111111-1111-4111-8111-111111111111",
        userId: "user_1",
        status: "completed"
      };
    },
    async createSortRunWithPlaylistRequests(input) {
      return {
        id: "22222222-2222-4222-8222-222222222222",
        userId: input.userId,
        librarySyncId: input.librarySyncId,
        state: "draft",
        requests: input.requests.map((request, index) => ({
          id: `request_${index}`,
          userPrompt: request.userPrompt,
          parsedRules: request.parsedRules
        }))
      };
    }
  };

  return Object.assign(store, overrides);
}

describe("parsePlaylistRequestLines", () => {
  it("parses common deterministic playlist requests into reviewable rules", () => {
    const requests = parsePlaylistRequestLines([
      "Ukrainian rap",
      "Gym rap",
      "Sad Slavic songs"
    ]);

    expect(requests).toEqual([
      expect.objectContaining({
        userPrompt: "Ukrainian rap",
        parsedRules: expect.objectContaining({
          title: "Ukrainian Rap",
          languages: ["ukrainian"],
          genres: ["Hip-Hop/Rap"],
          moods: []
        })
      }),
      expect.objectContaining({
        userPrompt: "Gym rap",
        parsedRules: expect.objectContaining({
          title: "Gym Rap",
          genres: ["Hip-Hop/Rap"],
          moods: ["Workout", "Hype"],
          energyMin: 0.65
        })
      }),
      expect.objectContaining({
        userPrompt: "Sad Slavic songs",
        parsedRules: expect.objectContaining({
          title: "Sad Slavic Songs",
          languages: ["ukrainian", "russian", "polish"],
          moods: ["Sad", "Melancholy"]
        })
      })
    ]);
  });

  it("deduplicates repeated lines and trims empty input", () => {
    expect(
      parsePlaylistRequestLines([" Ukrainian rap ", "", "Ukrainian rap"])
    ).toHaveLength(1);
  });

  it("parses mixed-language driving requests for tuned sorting", () => {
    const [request] = parsePlaylistRequestLines(["Mixed language driving rap"]);

    expect(request).toMatchObject({
      parsedRules: expect.objectContaining({
        title: "Mixed Language Driving Rap",
        languages: ["mixed"],
        genres: ["Hip-Hop/Rap"],
        moods: ["Driving"],
        energyMin: 0.45
      })
    });
  });
});

describe("createPlaylistRequestSortRun", () => {
  it("stores at least three parsed playlist requests against a completed sync", async () => {
    const store = createStore();

    await expect(
      createPlaylistRequestSortRun({
        store,
        userId: "user_1",
        librarySyncId: "11111111-1111-4111-8111-111111111111",
        playlistRequests: ["Ukrainian rap", "Gym rap", "Sad Slavic songs"]
      })
    ).resolves.toMatchObject({
      status: "created",
      sortRun: {
        state: "draft",
        requests: [
          expect.objectContaining({ userPrompt: "Ukrainian rap" }),
          expect.objectContaining({ userPrompt: "Gym rap" }),
          expect.objectContaining({ userPrompt: "Sad Slavic songs" })
        ]
      }
    });
  });

  it("rejects requests before a completed library sync exists", async () => {
    const store = createStore({
      async getCompletedLibrarySyncForUser() {
        return null;
      }
    });

    await expect(
      createPlaylistRequestSortRun({
        store,
        userId: "user_1",
        librarySyncId: "11111111-1111-4111-8111-111111111111",
        playlistRequests: ["Ukrainian rap", "Gym rap", "Sad Slavic songs"]
      })
    ).resolves.toEqual({
      status: "missing_completed_sync"
    });
  });

  it("requires at least three playlist requests", async () => {
    const store = createStore();

    await expect(
      createPlaylistRequestSortRun({
        store,
        userId: "user_1",
        librarySyncId: "11111111-1111-4111-8111-111111111111",
        playlistRequests: ["Ukrainian rap", "Gym rap"]
      })
    ).resolves.toEqual({
      status: "too_few_requests",
      minimumRequests: 3
    });
  });
});
