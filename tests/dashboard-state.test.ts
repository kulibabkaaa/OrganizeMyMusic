import { describe, expect, it } from "vitest";

import { deriveDashboardState } from "@/modules/dashboard/get-dashboard-state";

describe("deriveDashboardState", () => {
  it("keeps signed-out users in the signed-out dashboard state", () => {
    expect(
      deriveDashboardState({
        authStatus: "signed_out",
        hasAppleMusicConnection: false,
        latestLibrarySyncStatus: null,
        recentSortCount: 0,
        activeProcessingJobCount: 0
      })
    ).toBe("signed_out");
  });

  it("asks signed-in users to connect a library first", () => {
    expect(
      deriveDashboardState({
        authStatus: "authenticated",
        hasAppleMusicConnection: false,
        latestLibrarySyncStatus: null,
        recentSortCount: 0,
        activeProcessingJobCount: 0
      })
    ).toBe("no_library_connected");
  });

  it("shows setup progress until a connected library has a completed sync", () => {
    expect(
      deriveDashboardState({
        authStatus: "authenticated",
        hasAppleMusicConnection: true,
        latestLibrarySyncStatus: null,
        recentSortCount: 0,
        activeProcessingJobCount: 0
      })
    ).toBe("library_syncing");

    expect(
      deriveDashboardState({
        authStatus: "authenticated",
        hasAppleMusicConnection: true,
        latestLibrarySyncStatus: "syncing",
        recentSortCount: 0,
        activeProcessingJobCount: 0
      })
    ).toBe("library_syncing");

    expect(
      deriveDashboardState({
        authStatus: "authenticated",
        hasAppleMusicConnection: true,
        latestLibrarySyncStatus: "failed",
        recentSortCount: 0,
        activeProcessingJobCount: 0
      })
    ).toBe("library_syncing");
  });

  it("keeps active processing jobs in the syncing state", () => {
    expect(
      deriveDashboardState({
        authStatus: "authenticated",
        hasAppleMusicConnection: true,
        latestLibrarySyncStatus: "completed",
        recentSortCount: 0,
        activeProcessingJobCount: 1
      })
    ).toBe("library_syncing");
  });

  it("separates first-time ready users from returning users", () => {
    expect(
      deriveDashboardState({
        authStatus: "authenticated",
        hasAppleMusicConnection: true,
        latestLibrarySyncStatus: "completed",
        recentSortCount: 0,
        activeProcessingJobCount: 0
      })
    ).toBe("library_ready_no_sorts");

    expect(
      deriveDashboardState({
        authStatus: "authenticated",
        hasAppleMusicConnection: true,
        latestLibrarySyncStatus: "completed",
        recentSortCount: 2,
        activeProcessingJobCount: 0
      })
    ).toBe("library_ready_with_sorts");
  });
});
