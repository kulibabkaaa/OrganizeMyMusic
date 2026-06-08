import { describe, expect, it } from "vitest";

import { sanitizeLogObject } from "@/lib/logger";

describe("sanitizeLogObject", () => {
  it("redacts known and future token-like log keys recursively", () => {
    const sanitized = sanitizeLogObject({
      musicUserToken: "raw-music-user-token",
      nested: {
        appleAccessToken: "apple-access-token",
        safeCount: 3
      },
      requests: [
        {
          authorization: "Bearer secret",
          trackName: "Visible Track"
        }
      ]
    });

    expect(JSON.stringify(sanitized)).not.toContain("raw-music-user-token");
    expect(JSON.stringify(sanitized)).not.toContain("apple-access-token");
    expect(JSON.stringify(sanitized)).not.toContain("Bearer secret");
    expect(sanitized).toEqual({
      musicUserToken: "[Redacted]",
      nested: {
        appleAccessToken: "[Redacted]",
        safeCount: 3
      },
      requests: [
        {
          authorization: "[Redacted]",
          trackName: "Visible Track"
        }
      ]
    });
  });

  it("redacts token-like values under non-sensitive keys and errors", () => {
    const error = new Error("Apple Music raw-music-user-token rejected a request.");
    const sanitized = sanitizeLogObject({
      message: "Authorization failed for raw-music-user-token.",
      safeLabel: "Apple Music connected",
      error
    });

    expect(JSON.stringify(sanitized)).not.toContain("raw-music-user-token");
    expect(sanitized).toEqual({
      message: "[Redacted]",
      safeLabel: "Apple Music connected",
      error: {
        name: "Error",
        message: "[Redacted]",
        stack: "[Redacted]"
      }
    });
  });
});
