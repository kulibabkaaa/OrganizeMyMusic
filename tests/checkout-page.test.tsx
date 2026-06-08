import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SortStartPage } from "@/components/app/sort-start/sort-start-page";
import { summarizeCheckout } from "@/modules/payments/checkout";

describe("SortStartPage", () => {
  it("renders Sort-specific generation start summary with billing deferred copy", () => {
    const markup = renderToStaticMarkup(
      <SortStartPage
        sortId="sort_1"
        mode="deferred"
        summary={summarizeCheckout({
          sortName: "My Apple Music cleanup",
          recipeCount: 3,
          estimatedTrackCount: 90,
          mode: "deferred"
        })}
      />
    );

    expect(markup).toContain("Start full library organization");
    expect(markup).toContain("Generate proposed playlists from your Apple Music library");
    expect(markup).toContain("My Apple Music cleanup");
    expect(markup).toContain("Playlist Recipes");
    expect(markup).toContain("Apple Music");
    expect(markup).toContain("About 90 tracks across 3 Playlist Recipes");
    expect(markup).toContain("Included during MVP");
    expect(markup).toContain("Starting full organization queues playlist generation");
    expect(markup).toContain("Apple Music export still requires track review and explicit confirmation");
    expect(markup).toContain("Track-level review before export");
    expect(markup).toContain("Create Apple Music playlists and add approved tracks");
    expect(markup).toContain("Back to dashboard");
    expect(markup).toContain("View all Sorts");
    expect(markup).toContain("Back to builder");
    expect(markup).toContain("/app/sorts/sort_1/builder");
    expect(markup).not.toContain("Secure checkout");
    expect(markup).not.toContain("Pay and start");
  });

  it("keeps the checkout action disabled when payments are paused", () => {
    const markup = renderToStaticMarkup(
      <SortStartPage
        sortId="sort_1"
        mode="disabled"
        summary={summarizeCheckout({
          sortName: "My Apple Music cleanup",
          recipeCount: 3,
          estimatedTrackCount: 90,
          mode: "disabled"
        })}
      />
    );

    expect(markup).toContain("Full organization paused");
    expect(markup).toContain("Full organization processing is paused in this environment.");
    expect(markup).toContain('id="sort-start-disabled-reason"');
    expect(markup).toContain('aria-describedby="sort-start-disabled-reason"');
    expect(markup).toContain("disabled");
  });
});
