import { describe, expect, it } from "vitest";

import { getOAuthProviderAvailability } from "@/lib/auth/oauth";

describe("OAuth provider availability", () => {
  it("keeps Apple and Google disabled unless explicitly configured", () => {
    expect(getOAuthProviderAvailability({})).toEqual({
      apple: {
        enabled: false,
        disabledReason: "Apple sign-in is not configured yet."
      },
      google: {
        enabled: false,
        disabledReason: "Google sign-in is not configured yet."
      }
    });
  });

  it("enables configured providers", () => {
    expect(
      getOAuthProviderAvailability({
        AUTH_APPLE_OAUTH_ENABLED: "true",
        AUTH_GOOGLE_OAUTH_ENABLED: "1"
      })
    ).toEqual({
      apple: {
        enabled: true,
        disabledReason: null
      },
      google: {
        enabled: true,
        disabledReason: null
      }
    });
  });
});
