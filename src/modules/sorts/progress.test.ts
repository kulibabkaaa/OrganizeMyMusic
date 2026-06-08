import { describe, expect, it } from "vitest";

import {
  getSortProcessingProgress,
  processingStepLabels
} from "@/modules/sorts/progress";

describe("getSortProcessingProgress", () => {
  it("derives full-sort progress from active job stages", () => {
    const progress = getSortProcessingProgress({
      state: "paid",
      paymentStatus: "paid",
      recipeCount: 3,
      trackCountProcessed: 19960,
      activeJobStages: ["full_sort"]
    });

    expect(progress).toMatchObject({
      percent: 58,
      currentStep: "Building playlists",
      estimatedTimeRemaining: "About 4 min remaining",
      recipeCount: 3,
      trackCountProcessed: 19960,
      status: "running"
    });
    expect(progress.steps.map((step) => step.label)).toEqual(processingStepLabels);
    expect(progress.steps.map((step) => step.status)).toEqual([
      "done",
      "done",
      "live",
      "pending",
      "pending",
      "pending"
    ]);
  });

  it("marks ready and failed states distinctly", () => {
    expect(
      getSortProcessingProgress({
        state: "paid",
        paymentStatus: "paid",
        recipeCount: 2,
        trackCountProcessed: 400,
        generatedPlaylistCount: 2
      })
    ).toMatchObject({
      percent: 100,
      currentStep: "Ready",
      status: "ready"
    });

    expect(
      getSortProcessingProgress({
        state: "failed",
        paymentStatus: "paid",
        recipeCount: 2,
        trackCountProcessed: 400,
        activeJobStages: ["classifying"]
      })
    ).toMatchObject({
      currentStep: "Classifying tracks",
      status: "failed",
      recoveryActionLabel: "View issue / Retry"
    });
  });
});
