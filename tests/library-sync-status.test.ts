import { describe, expect, it } from "vitest";

import {
  getLibrarySyncDisplayState,
  isActiveLibrarySyncStatus
} from "@/modules/library-syncs/status";

describe("library sync display state", () => {
  it.each([
    ["queued", 12],
    ["syncing", 48],
    ["normalizing", 78]
  ] as const)("marks %s as active", (status, progressPercent) => {
    const state = getLibrarySyncDisplayState(status);

    expect(state.isActive).toBe(true);
    expect(state.isTerminal).toBe(false);
    expect(state.progressPercent).toBe(progressPercent);
    expect(isActiveLibrarySyncStatus(status)).toBe(true);
  });

  it("marks completed syncs as terminal success", () => {
    const state = getLibrarySyncDisplayState("completed");

    expect(state).toMatchObject({
      label: "complete",
      progressPercent: 100,
      tone: "success",
      isActive: false,
      isTerminal: true
    });
  });

  it("surfaces failure summaries", () => {
    const state = getLibrarySyncDisplayState("failed", "Apple Music rejected the token.");

    expect(state.label).toBe("failed");
    expect(state.description).toContain("Apple Music rejected the token.");
    expect(state.tone).toBe("warning");
    expect(state.isTerminal).toBe(true);
  });

  it("keeps not-started syncs inactive", () => {
    const state = getLibrarySyncDisplayState("not_started");

    expect(state.progressPercent).toBe(0);
    expect(state.isActive).toBe(false);
    expect(isActiveLibrarySyncStatus("not_started")).toBe(false);
  });
});
