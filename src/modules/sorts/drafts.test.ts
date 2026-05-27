import { describe, expect, it } from "vitest";

import {
  createSortDraft,
  createSortDraftSchema,
  getPreviewReadiness,
  updateSortDraft,
  type SortDraftStore
} from "@/modules/sorts/drafts";

function createStore(overrides: Partial<SortDraftStore> = {}) {
  const store: SortDraftStore = {
    async getLibrarySyncForUser(input) {
      return {
        id: input.librarySyncId,
        status: "completed"
      };
    },
    async createSortDraft(input) {
      return {
        id: "33333333-3333-4333-8333-333333333333",
        userId: input.userId,
        librarySyncId: input.librarySyncId ?? null,
        name: input.name,
        sourceProvider: input.sourceProvider,
        state: "draft",
        paymentStatus: "pending",
        createdAt: "2026-05-26T10:00:00.000Z",
        updatedAt: "2026-05-26T10:00:00.000Z"
      };
    },
    async getSortDraft(input) {
      return {
        id: input.sortId,
        userId: input.userId,
        librarySyncId: "11111111-1111-4111-8111-111111111111",
        name: "Road trip cleanup",
        sourceProvider: "apple_music",
        state: "draft",
        paymentStatus: "pending",
        createdAt: "2026-05-26T10:00:00.000Z",
        updatedAt: "2026-05-26T10:00:00.000Z"
      };
    },
    async updateSortDraft(input) {
      return {
        id: input.sortId,
        userId: input.userId,
        librarySyncId: input.values.librarySyncId ?? "11111111-1111-4111-8111-111111111111",
        name: input.values.name ?? "Road trip cleanup",
        sourceProvider: "apple_music",
        state: "draft",
        paymentStatus: "pending",
        createdAt: "2026-05-26T10:00:00.000Z",
        updatedAt: "2026-05-26T10:05:00.000Z"
      };
    }
  };

  return Object.assign(store, overrides);
}

describe("createSortDraftSchema", () => {
  it("validates Apple Music draft payloads and trims names", () => {
    expect(
      createSortDraftSchema.parse({
        name: "  Road trip cleanup  "
      })
    ).toEqual({
      name: "Road trip cleanup",
      sourceProvider: "apple_music"
    });

    expect(() =>
      createSortDraftSchema.parse({
        name: "Spotify import",
        sourceProvider: "spotify"
      })
    ).toThrow();
  });
});

describe("createSortDraft", () => {
  it("creates an Apple Music draft without requiring a completed library sync", async () => {
    await expect(
      createSortDraft({
        store: createStore(),
        userId: "user_1",
        input: {
          name: "Night music system",
          librarySyncId: "11111111-1111-4111-8111-111111111111"
        }
      })
    ).resolves.toMatchObject({
      status: "created",
      sort: {
        name: "Night music system",
        sourceProvider: "apple_music",
        librarySyncId: "11111111-1111-4111-8111-111111111111",
        state: "draft"
      },
      preview: {
        canPreview: true,
        disabledReason: null
      }
    });
  });

  it("allows syncing library drafts but disables preview until sync is completed", async () => {
    const result = await createSortDraft({
      store: createStore({
        async getLibrarySyncForUser(input) {
          return {
            id: input.librarySyncId,
            status: "syncing"
          };
        }
      }),
      userId: "user_1",
      input: {
        name: "Syncing draft",
        librarySyncId: "11111111-1111-4111-8111-111111111111"
      }
    });

    expect(result).toMatchObject({
      status: "created",
      preview: {
        canPreview: false,
        disabledReason: "Library sync must finish before previewing this Sort."
      }
    });
  });

  it("returns a clear result when the requested library sync does not belong to the user", async () => {
    await expect(
      createSortDraft({
        store: createStore({
          async getLibrarySyncForUser() {
            return null;
          }
        }),
        userId: "user_1",
        input: {
          name: "Bad sync",
          librarySyncId: "11111111-1111-4111-8111-111111111111"
        }
      })
    ).resolves.toEqual({
      status: "missing_library_sync"
    });
  });
});

describe("updateSortDraft", () => {
  it("updates draft metadata and recalculates preview readiness", async () => {
    await expect(
      updateSortDraft({
        store: createStore({
          async getLibrarySyncForUser(input) {
            return {
              id: input.librarySyncId,
              status: "normalizing"
            };
          }
        }),
        userId: "user_1",
        sortId: "33333333-3333-4333-8333-333333333333",
        input: {
          name: "Road trip cleanup",
          librarySyncId: "11111111-1111-4111-8111-111111111111"
        }
      })
    ).resolves.toMatchObject({
      status: "updated",
      sort: {
        name: "Road trip cleanup"
      },
      preview: {
        canPreview: false,
        disabledReason: "Library sync must finish before previewing this Sort."
      }
    });
  });
});

describe("getPreviewReadiness", () => {
  it("requires a completed library sync before preview generation", () => {
    expect(getPreviewReadiness(null)).toEqual({
      canPreview: false,
      disabledReason: "Connect and sync Apple Music before previewing this Sort."
    });
    expect(getPreviewReadiness("queued")).toEqual({
      canPreview: false,
      disabledReason: "Library sync must finish before previewing this Sort."
    });
    expect(getPreviewReadiness("completed")).toEqual({
      canPreview: true,
      disabledReason: null
    });
  });
});
