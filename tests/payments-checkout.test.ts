import { describe, expect, it } from "vitest";

import {
  getCheckoutMode,
  summarizeCheckout
} from "@/modules/payments/checkout";

describe("payments checkout", () => {
  it("keeps checkout disabled unless payments or the explicit dev bypass are enabled", () => {
    expect(getCheckoutMode({})).toBe("disabled");
    expect(getCheckoutMode({ PAYMENTS_ENABLED: "false" })).toBe("disabled");
    expect(getCheckoutMode({ PAYMENTS_DEV_BYPASS_ENABLED: "false" })).toBe("disabled");
  });

  it("enables only the explicit dev bypass when approved", () => {
    expect(getCheckoutMode({ PAYMENTS_DEV_BYPASS_ENABLED: "true" })).toBe("dev_bypass");
    expect(getCheckoutMode({ PAYMENTS_DEV_BYPASS_ENABLED: "1" })).toBe("dev_bypass");
  });

  it("uses Stripe mode only when payments are enabled", () => {
    expect(getCheckoutMode({ PAYMENTS_ENABLED: "true" })).toBe("stripe");
    expect(getCheckoutMode({ PAYMENTS_ENABLED: "1", PAYMENTS_DEV_BYPASS_ENABLED: "true" })).toBe("stripe");
  });

  it("summarizes the Sort-specific checkout surface", () => {
    expect(
      summarizeCheckout({
        sortName: "My Apple Music cleanup",
        recipeCount: 3,
        estimatedTrackCount: 90,
        mode: "dev_bypass"
      })
    ).toEqual({
      title: "Unlock this Sort",
      description:
        "Generate full playlists from your Apple Music library, review the results, and export them to Apple Music.",
      sortName: "My Apple Music cleanup",
      recipeCount: 3,
      connectedLibrary: "Apple Music",
      estimatedOutput: "About 90 tracks across 3 Playlist Recipes",
      priceLabel: "Dev bypass enabled",
      included: [
        "Full library analysis",
        "Generated playlists from your recipes",
        "Track-level review before export",
        "Create playlists in Apple Music"
      ],
      ctaLabel: "Use approved dev bypass"
    });
  });
});
