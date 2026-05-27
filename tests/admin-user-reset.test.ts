import { describe, expect, it, vi } from "vitest";

import {
  executeUserDataReset,
  getUserResetConfirmationText,
  previewUserDataReset,
  type PgBossUserJobStore,
  type UserDataResetCounts,
  type UserResetProfile,
  type UserResetStore
} from "@/modules/admin/user-reset";

const baseCounts: Omit<UserDataResetCounts, "pgBossJobCount"> = {
  profileCount: 1,
  appleMusicConnectionCount: 1,
  librarySyncCount: 2,
  rawLibraryTrackCount: 80,
  trackOwnershipCount: 75,
  sortRunCount: 3,
  playlistRequestCount: 3,
  playlistRecipeCount: 5,
  sortPlaylistCount: 8,
  sortPlaylistTrackCount: 120,
  paymentCount: 0,
  jobEventCount: 12
};

const adminProfile: UserResetProfile = {
  id: "admin_1",
  email: "admin@example.com",
  isAdmin: true
};

const targetProfile: UserResetProfile = {
  id: "user_1",
  email: "listener@example.com",
  isAdmin: false
};

function createStore(overrides: Partial<UserResetStore> = {}) {
  const store: UserResetStore = {
    getProfileById: vi.fn(async (userId) => (userId === adminProfile.id ? adminProfile : null)),
    getProfileByEmail: vi.fn(async (email) =>
      email === targetProfile.email ? targetProfile : null
    ),
    countUserData: vi.fn(async () => baseCounts),
    deleteAuthUser: vi.fn(async () => undefined),
    ...overrides
  };

  return store;
}

function createPgBossJobs(overrides: Partial<PgBossUserJobStore> = {}) {
  const jobs: PgBossUserJobStore = {
    countJobsForUser: vi.fn(async () => 4),
    deleteJobsForUser: vi.fn(async () => 4),
    ...overrides
  };

  return jobs;
}

describe("admin user reset", () => {
  it("requires an admin requester before showing reset counts", async () => {
    const store = createStore({
      getProfileById: vi.fn(async () => ({
        ...targetProfile,
        id: "non_admin_1"
      }))
    });

    await expect(
      previewUserDataReset({
        store,
        pgBossJobs: createPgBossJobs(),
        requesterUserId: "non_admin_1",
        email: "listener@example.com"
      })
    ).resolves.toEqual({ status: "forbidden" });
    expect(store.countUserData).not.toHaveBeenCalled();
  });

  it("shows counts and confirmation text before deletion", async () => {
    await expect(
      previewUserDataReset({
        store: createStore(),
        pgBossJobs: createPgBossJobs(),
        requesterUserId: adminProfile.id,
        email: " Listener@Example.com "
      })
    ).resolves.toEqual({
      status: "ready",
      target: targetProfile,
      counts: {
        ...baseCounts,
        pgBossJobCount: 4
      },
      confirmationText: "RESET listener@example.com"
    });
  });

  it("does not delete without exact typed confirmation", async () => {
    const store = createStore();
    const pgBossJobs = createPgBossJobs();

    await expect(
      executeUserDataReset({
        store,
        pgBossJobs,
        requesterUserId: adminProfile.id,
        email: "listener@example.com",
        confirmation: "RESET"
      })
    ).resolves.toMatchObject({
      status: "confirmation_required",
      confirmationText: "RESET listener@example.com"
    });
    expect(pgBossJobs.deleteJobsForUser).not.toHaveBeenCalled();
    expect(store.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("deletes pg-boss jobs before deleting the auth user after confirmation", async () => {
    const order: string[] = [];
    const store = createStore({
      deleteAuthUser: vi.fn(async () => {
        order.push("auth");
      })
    });
    const pgBossJobs = createPgBossJobs({
      deleteJobsForUser: vi.fn(async () => {
        order.push("pgboss");
        return 4;
      })
    });

    await expect(
      executeUserDataReset({
        store,
        pgBossJobs,
        requesterUserId: adminProfile.id,
        email: "listener@example.com",
        confirmation: getUserResetConfirmationText("listener@example.com")
      })
    ).resolves.toMatchObject({
      status: "deleted",
      targetEmail: "listener@example.com",
      deletedPgBossJobCount: 4
    });
    expect(order).toEqual(["pgboss", "auth"]);
    expect(store.deleteAuthUser).toHaveBeenCalledWith("user_1");
  });

  it("blocks self reset and reset without pg-boss cleanup", async () => {
    await expect(
      executeUserDataReset({
        store: createStore({
          getProfileByEmail: vi.fn(async () => adminProfile)
        }),
        pgBossJobs: createPgBossJobs(),
        requesterUserId: adminProfile.id,
        email: "admin@example.com",
        confirmation: getUserResetConfirmationText("admin@example.com")
      })
    ).resolves.toMatchObject({
      status: "self_reset_blocked"
    });

    await expect(
      executeUserDataReset({
        store: createStore(),
        pgBossJobs: null,
        requesterUserId: adminProfile.id,
        email: "listener@example.com",
        confirmation: getUserResetConfirmationText("listener@example.com")
      })
    ).resolves.toMatchObject({
      status: "pg_boss_unavailable"
    });
  });
});
