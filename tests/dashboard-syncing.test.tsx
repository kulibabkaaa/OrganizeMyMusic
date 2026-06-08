import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DashboardSyncing } from "@/components/app/dashboard/dashboard-syncing";
import { Button } from "@/components/ui/button";
import {
  queueLibrarySyncAfterConnection,
  type LibrarySyncStore
} from "@/modules/library-syncs/queue";

function createSyncStore(overrides: Partial<LibrarySyncStore> = {}) {
  const store: LibrarySyncStore = {
    async getConnectedAppleMusicConnection() {
      return {
        id: "connection_1",
        status: "connected",
        storefront: "us",
        encryptedUserToken: "encrypted-token"
      };
    },
    async createQueuedSync(userId) {
      return {
        id: "sync_1",
        userId,
        status: "queued",
        rawTrackCount: 0,
        normalizedTrackCount: 0,
        duplicateCount: 0,
        errorSummary: null,
        createdAt: "2026-05-26T00:00:00.000Z",
        updatedAt: "2026-05-26T00:00:00.000Z"
      };
    },
    createJobEvent: vi.fn(async () => undefined),
    async getSyncForUser() {
      return null;
    },
    async getLatestSyncForUser() {
      return null;
    },
    async listSyncEvents() {
      return [];
    },
    markSyncing: vi.fn(async () => undefined),
    storeRawTracks: vi.fn(async () => undefined),
    storeNormalizedTracks: vi.fn(async () => ({
      normalizedTrackIds: [],
      normalizedTracks: []
    })),
    storeTrackClassifications: vi.fn(async () => undefined),
    markNormalizedTracksStored: vi.fn(async () => undefined),
    markFailed: vi.fn(async () => undefined)
  };

  return Object.assign(store, overrides);
}

describe("DashboardSyncing", () => {
  it("shows connected sync progress and draft guidance", () => {
    const markup = renderToStaticMarkup(
      <DashboardSyncing
        latestSync={{
          id: "sync_1",
          userId: "user_1",
          status: "syncing",
          rawTrackCount: 8420,
          normalizedTrackCount: 0,
          duplicateCount: 0,
          errorSummary: null,
          createdAt: "2026-05-26T00:00:00.000Z",
          updatedAt: "2026-05-26T00:00:00.000Z"
        }}
        syncFallbackAction={<Button>Start sync</Button>}
      />
    );

    expect(markup).toContain("Apple Music connected");
    expect(markup).toContain("Syncing your library so you can create your first Sort.");
    expect(markup).toContain('aria-valuenow="42"');
    expect(markup).toContain("Reading metadata");
    expect(markup).toContain("8,420 tracks read");
    expect(markup).toContain("Latest status");
    expect(markup).toContain("Sync running");
    expect(markup).toContain("Tracks read");
    expect(markup).toContain("Songs indexed");
    expect(markup).toContain("Estimated time appears after progress starts.");
    expect(markup).toContain("Create Sort Draft");
    expect(markup).toContain(
      "You can name a Sort and draft Playlist Recipes now. Preview stays locked until the library index is ready."
    );
  });

  it("shows a prominent start-sync fallback when no sync is active", () => {
    const markup = renderToStaticMarkup(
      <DashboardSyncing latestSync={null} syncFallbackAction={<Button>Start background sync</Button>} />
    );

    expect(markup).toContain("Start background sync");
    expect(markup).toContain("Library sync is ready to start.");
    expect(markup).toContain("Not started");
    expect(markup).toContain('aria-valuenow="0"');
  });

  it("shows failed sync error details and retry action", () => {
    const markup = renderToStaticMarkup(
      <DashboardSyncing
        latestSync={{
          id: "sync_failed",
          userId: "user_1",
          status: "failed",
          rawTrackCount: 240,
          normalizedTrackCount: 0,
          duplicateCount: 0,
          errorSummary: "Apple Music rejected the request.",
          createdAt: "2026-05-26T00:00:00.000Z",
          updatedAt: "2026-05-26T00:01:00.000Z"
        }}
        syncFallbackAction={<Button>Retry sync</Button>}
      />
    );

    expect(markup).toContain("Sync failed");
    expect(markup).toContain("Last error");
    expect(markup).toContain("Apple Music rejected the request.");
    expect(markup).toContain("Retry sync");
  });
});

describe("queueLibrarySyncAfterConnection", () => {
  it("queues a library sync after Apple Music is connected", async () => {
    const send = vi.fn(async () => "job_1");

    await expect(
      queueLibrarySyncAfterConnection({
        store: createSyncStore(),
        queue: { send },
        userId: "user_1"
      })
    ).resolves.toMatchObject({
      status: "queued",
      sync: {
        id: "sync_1",
        status: "queued"
      },
      jobId: "job_1"
    });

    expect(send).toHaveBeenCalledOnce();
  });

  it("does not queue a duplicate sync when one is already active", async () => {
    const send = vi.fn(async () => "job_1");
    const createQueuedSync = vi.fn();

    await expect(
      queueLibrarySyncAfterConnection({
        store: createSyncStore({
          createQueuedSync,
          async getLatestSyncForUser(userId) {
            return {
              id: "sync_active",
              userId,
              status: "normalizing",
              rawTrackCount: 200,
              normalizedTrackCount: 160,
              duplicateCount: 0,
              errorSummary: null,
              createdAt: "2026-05-26T00:00:00.000Z",
              updatedAt: "2026-05-26T00:01:00.000Z"
            };
          }
        }),
        queue: { send },
        userId: "user_1"
      })
    ).resolves.toMatchObject({
      status: "already_active",
      sync: {
        id: "sync_active",
        status: "normalizing"
      }
    });

    expect(createQueuedSync).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
