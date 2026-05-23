import { describe, expect, it } from "vitest";

import {
  acceptAppleMusicConnection,
  parseAppleMusicConnectPayload
} from "@/modules/apple-music/connect";

describe("parseAppleMusicConnectPayload", () => {
  it("accepts MusicKit user token and storefront only", () => {
    const parsed = parseAppleMusicConnectPayload({
      musicUserToken: "music-user-token",
      storefront: "us",
      userId: "browser-supplied-user"
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success ? parsed.data : null).toEqual({
      musicUserToken: "music-user-token",
      storefront: "us"
    });
  });

  it("rejects empty MusicKit tokens", () => {
    const parsed = parseAppleMusicConnectPayload({
      musicUserToken: "",
      storefront: "us"
    });

    expect(parsed.success).toBe(false);
  });
});

describe("acceptAppleMusicConnection", () => {
  it("does not return the raw MusicKit user token", () => {
    const response = acceptAppleMusicConnection({
      userId: "user_1",
      musicUserToken: "secret-music-user-token",
      storefront: "gb"
    });

    expect(response).toEqual({
      status: "connected",
      storefront: "gb"
    });
    expect(JSON.stringify(response)).not.toContain("secret-music-user-token");
  });
});
