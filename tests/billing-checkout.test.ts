import { describe, expect, it } from "vitest";

import { createSortCheckoutSession } from "@/modules/billing/checkout";

describe("legacy sort checkout", () => {
  it("does not create a payment bypass by default", async () => {
    await expect(createSortCheckoutSession("sort_123", {})).resolves.toEqual({
      mode: "disabled",
      checkoutUrl: null
    });
  });

  it("uses the explicit approved dev bypass flag", async () => {
    await expect(
      createSortCheckoutSession("sort_123", {
        PAYMENTS_DEV_BYPASS_ENABLED: "true"
      })
    ).resolves.toEqual({
      mode: "dev_bypass",
      checkoutUrl: "/app/sorts/sort_123?payment=dev_bypass"
    });
  });
});
