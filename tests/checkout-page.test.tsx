import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CheckoutPage } from "@/components/app/checkout/checkout-page";
import { summarizeCheckout } from "@/modules/payments/checkout";

describe("CheckoutPage", () => {
  it("renders Sort-specific checkout summary and approved dev bypass copy", () => {
    const markup = renderToStaticMarkup(
      <CheckoutPage
        sortId="sort_1"
        mode="dev_bypass"
        summary={summarizeCheckout({
          sortName: "My Apple Music cleanup",
          recipeCount: 3,
          estimatedTrackCount: 90,
          mode: "dev_bypass"
        })}
      />
    );

    expect(markup).toContain("Unlock this Sort");
    expect(markup).toContain("Generate full playlists from your Apple Music library");
    expect(markup).toContain("My Apple Music cleanup");
    expect(markup).toContain("Playlist Recipes");
    expect(markup).toContain("Apple Music");
    expect(markup).toContain("About 90 tracks across 3 Playlist Recipes");
    expect(markup).toContain("Dev bypass enabled");
    expect(markup).toContain("Use approved dev bypass");
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

    expect(markup).toContain("Payment is paused.");
    expect(markup).toContain("Full Sort processing stays blocked until payment is enabled.");
    expect(markup).toContain('id="checkout-disabled-reason"');
    expect(markup).toContain('aria-describedby="checkout-disabled-reason"');
    expect(markup).toContain("disabled");
  });
});
