import { describe, expect, it } from "vitest";

import {
  createPrivacySafeFailure,
  createPrivacySafeJobDetails
} from "@/modules/activity/privacy-safe-observability";

describe("privacy-safe observability", () => {
  it("categorizes failures without echoing raw music data or tokens", () => {
    const failure = createPrivacySafeFailure({
      workflowName: "Library sync",
      error: new Error("Apple Music raw-music-user-token rejected First Song by Artist A.")
    });

    const serialized = JSON.stringify(failure);

    expect(failure).toEqual({
      category: "authentication",
      message: "Library sync failed. Failure category: authentication."
    });
    expect(serialized).not.toContain("raw-music-user-token");
    expect(serialized).not.toContain("First Song");
    expect(serialized).not.toContain("Artist A");
  });

  it("keeps job details to event metadata and aggregate counts", () => {
    const details = createPrivacySafeJobDetails({
      eventType: "library_sync_completed",
      durationMs: 1234,
      counts: {
        rawTrackCount: 10,
        normalizedTrackCount: 8,
        duplicateCount: 2
      }
    });

    expect(details).toEqual({
      eventType: "library_sync_completed",
      durationMs: 1234,
      rawTrackCount: 10,
      normalizedTrackCount: 8,
      duplicateCount: 2
    });
  });
});
