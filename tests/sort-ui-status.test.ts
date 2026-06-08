import { describe, expect, it } from "vitest";

import { getSortPrimaryRoute, getSortUiStatus } from "@/modules/sorts/ui-status";
import type { SortRunState } from "@/types/domain";

function sortInput(overrides: Partial<Parameters<typeof getSortUiStatus>[0]> = {}) {
  return {
    state: "draft" as SortRunState,
    paymentStatus: "pending" as const,
    hasPreviewSnapshot: false,
    generatedPlaylistCount: 0,
    applePlaylistIdCount: 0,
    activeJobStages: [],
    ...overrides
  };
}

describe("getSortUiStatus", () => {
  it("maps current backend sort states into platform UI lifecycle states", () => {
    expect(getSortUiStatus(sortInput({ state: "draft" }))).toBe("draft");
    expect(getSortUiStatus(sortInput({ state: "syncing" }))).toBe("preview_generating");
    expect(getSortUiStatus(sortInput({ state: "classifying" }))).toBe("preview_generating");
    expect(
      getSortUiStatus(sortInput({ state: "preview_ready", hasPreviewSnapshot: true }))
    ).toBe("preview_ready");
    expect(getSortUiStatus(sortInput({ state: "awaiting_payment" }))).toBe(
      "awaiting_payment"
    );
    expect(getSortUiStatus(sortInput({ state: "paid", paymentStatus: "paid" }))).toBe(
      "paid"
    );
    expect(
      getSortUiStatus(sortInput({ state: "creating_playlists", paymentStatus: "paid" }))
    ).toBe("exporting");
    expect(getSortUiStatus(sortInput({ state: "failed" }))).toBe("failed");
  });

  it("uses generated and exported playlist counts for review and complete states", () => {
    expect(
      getSortUiStatus(
        sortInput({
          state: "paid",
          paymentStatus: "paid",
          generatedPlaylistCount: 2,
          applePlaylistIdCount: 0
        })
      )
    ).toBe("ready_for_review");

    expect(
      getSortUiStatus(
        sortInput({
          state: "completed",
          paymentStatus: "paid",
          generatedPlaylistCount: 2,
          applePlaylistIdCount: 2
        })
      )
    ).toBe("exported");
  });

  it("uses active job stages when the database state has not caught up yet", () => {
    expect(
      getSortUiStatus(
        sortInput({
          state: "draft",
          activeJobStages: ["preview"]
        })
      )
    ).toBe("preview_generating");

    expect(
      getSortUiStatus(
        sortInput({
          state: "paid",
          paymentStatus: "paid",
          activeJobStages: ["classifying"]
        })
      )
    ).toBe("processing");

    expect(
      getSortUiStatus(
        sortInput({
          state: "paid",
          paymentStatus: "paid",
          activeJobStages: ["create_playlists"]
        })
      )
    ).toBe("exporting");
  });
});

describe("getSortPrimaryRoute", () => {
  it("maps UI statuses to canonical app routes", () => {
    expect(getSortPrimaryRoute("sort_1", "draft")).toBe("/app/sorts/sort_1/builder");
    expect(getSortPrimaryRoute("sort_1", "preview_generating")).toBe(
      "/app/sorts/sort_1/preview"
    );
    expect(getSortPrimaryRoute("sort_1", "preview_ready")).toBe(
      "/app/sorts/sort_1/preview"
    );
    expect(getSortPrimaryRoute("sort_1", "awaiting_payment")).toBe(
      "/app/sorts/sort_1/preview"
    );
    expect(getSortPrimaryRoute("sort_1", "paid")).toBe("/app/sorts/sort_1/processing");
    expect(getSortPrimaryRoute("sort_1", "processing")).toBe(
      "/app/sorts/sort_1/processing"
    );
    expect(getSortPrimaryRoute("sort_1", "ready_for_review")).toBe(
      "/app/sorts/sort_1/review"
    );
    expect(getSortPrimaryRoute("sort_1", "exporting")).toBe(
      "/app/sorts/sort_1/exporting"
    );
    expect(getSortPrimaryRoute("sort_1", "exported")).toBe("/app/sorts/sort_1/complete");
    expect(getSortPrimaryRoute("sort_1", "failed")).toBe("/app/sorts/sort_1/review");
  });
});
