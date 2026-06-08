import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CheckoutPage } from "@/components/app/checkout/checkout-page";
import { summarizeCheckout } from "@/modules/payments/checkout";

describe("CheckoutPage", () => {
  it("renders Sort-specific checkout summary with billing deferred copy", () => {
    const markup = renderToStaticMarkup(
      <CheckoutPage
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

    expect(markup).toContain("Start full Sort");
    expect(markup).toContain("Generate full playlists from your Apple Music library");
    expect(markup).toContain("My Apple Music cleanup");
    expect(markup).toContain("Playlist Recipes");
    expect(markup).toContain("Apple Music");
    expect(markup).toContain("About 90 tracks across 3 Playlist Recipes");
    expect(markup).toContain("Billing deferred");
    expect(markup).toContain("Starting this Sort queues full playlist generation");
    expect(markup).toContain("Apple Music export still requires track review and explicit confirmation");
    expect(markup).toContain("Track-level review before export");
    expect(markup).toContain("Back to dashboard");
    expect(markup).toContain("View all Sorts");
    expect(markup).toContain("Back to builder");
    expect(markup).toContain("/app/sorts/sort_1/builder");
  });

  it("keeps the checkout action disabled when payments are paused", () => {
    const markup = renderToStaticMarkup(
      <CheckoutPage
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

    expect(markup).toContain("Full Sort paused");
    expect(markup).toContain("Full Sort processing is paused in this environment.");
    expect(markup).toContain('id="checkout-disabled-reason"');
    expect(markup).toContain('aria-describedby="checkout-disabled-reason"');
    expect(markup).toContain("disabled");
  });
});
