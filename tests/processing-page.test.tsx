import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProcessingPage } from "@/components/app/processing/processing-page";
import { ProcessingSteps } from "@/components/app/processing/processing-steps";
import { getSortProcessingProgress } from "@/modules/sorts/progress";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

const progress = getSortProcessingProgress({
  state: "paid",
  paymentStatus: "paid",
  recipeCount: 3,
  trackCountProcessed: 19960,
  activeJobStages: ["full_sort"]
});

describe("processing page", () => {
  it("renders the full-organization processing state and dashboard return action", () => {
    const markup = renderToStaticMarkup(
      <ProcessingPage
        sortId="33333333-3333-4333-8333-333333333333"
        sortName="My Apple Music cleanup"
        progress={progress}
      />
    );

    expect(markup).toContain("Sorting your library");
    expect(markup).toContain("You can leave and return later. Processing jobs stay attached to this Sort.");
    expect(markup).toContain("58%");
    expect(markup).toContain("About 4 min remaining");
    expect(markup).toContain("Building playlists");
    expect(markup).toContain("Organization started");
    expect(markup).toContain("3 Playlist Recipes");
    expect(markup).toContain("19,960 tracks processed");
    expect(markup).toContain("Back to dashboard");
    expect(markup).toContain("/app");
    expect(markup).toContain("View all Sorts");
    expect(markup).toContain("/app/sorts");
    expect(markup).toContain("Apple Music export will wait for your review.");
    expect(markup).toContain("Processing status auto-refresh every 3 seconds.");
    expect(markup).not.toContain("Export to Apple Music");
    expect(markup).not.toContain("Payment confirmed");
  });

  it("renders all processing steps with live state", () => {
    const markup = renderToStaticMarkup(<ProcessingSteps steps={progress.steps} />);

    expect(markup).toContain("Preparing library");
    expect(markup).toContain("Classifying tracks");
    expect(markup).toContain("Building playlists");
    expect(markup).toContain("Removing duplicates");
    expect(markup).toContain("Preparing review");
    expect(markup).toContain("Ready");
    expect(markup).toContain("Current");
  });

  it("shows the review action after processing completes", () => {
    const readyProgress = getSortProcessingProgress({
      state: "paid",
      paymentStatus: "paid",
      recipeCount: 1,
      trackCountProcessed: 360,
      generatedPlaylistCount: 1,
      activeJobStages: ["preparing_review", "full_sort"]
    });
    const markup = renderToStaticMarkup(
      <ProcessingPage
        sortId="33333333-3333-4333-8333-333333333333"
        sortName="My Apple Music cleanup"
        progress={readyProgress}
      />
    );

    expect(markup).toContain("Ready for review");
    expect(markup).toContain("Review playlists");
    expect(markup).toContain("/app/sorts/33333333-3333-4333-8333-333333333333/review");
    expect(markup).not.toContain("Processing status auto-refresh every 3 seconds.");
  });
});
