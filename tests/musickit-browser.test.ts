import { describe, expect, it, vi } from "vitest";

import {
  createAppleMusicConnectRequest,
  fetchAppleDeveloperToken,
  getAuthorizedAppleMusicUserToken
} from "@/modules/apple-music/musickit-browser";

describe("fetchAppleDeveloperToken", () => {
  it("requests the server developer token endpoint without caching", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        developerToken: "developer-token",
        expiresAt: "2026-05-22T12:30:00.000Z"
      })
    );

    await expect(fetchAppleDeveloperToken(fetcher)).resolves.toEqual({
      developerToken: "developer-token",
      expiresAt: "2026-05-22T12:30:00.000Z"
    });
    expect(fetcher).toHaveBeenCalledWith("/api/apple/developer-token", {
      cache: "no-store",
      method: "GET"
    });
  });

  it("surfaces server preparation errors without exposing secret values", async () => {
    const fetcher = vi.fn(async () =>
      Response.json(
        {
          error: "Apple Music developer token is not configured.",
          missing: ["APPLE_PRIVATE_KEY"]
        },
        { status: 503 }
      )
    );

    await expect(fetchAppleDeveloperToken(fetcher)).rejects.toThrow(
      "Apple Music developer token is not configured. Missing: APPLE_PRIVATE_KEY."
    );
  });
});

describe("getAuthorizedAppleMusicUserToken", () => {
  it("configures MusicKit and returns the authorized user token plus storefront", async () => {
    const authorize = vi.fn(async () => "music-user-token");
    const configure = vi.fn(() => ({
      authorize,
      storefrontId: "pl"
    }));
    const musicKit = {
      configure,
      getInstance: vi.fn()
    };

    await expect(
      getAuthorizedAppleMusicUserToken({
        musicKit,
        developerToken: "developer-token",
        appName: "OrganizeMyMusic",
        appBuild: "mvp"
      })
    ).resolves.toEqual({
      musicUserToken: "music-user-token",
      storefront: "pl"
    });
    expect(configure).toHaveBeenCalledWith({
      developerToken: "developer-token",
      app: {
        name: "OrganizeMyMusic",
        build: "mvp"
      }
    });
  });

  it("fails clearly when MusicKit authorization never resolves", async () => {
    vi.useFakeTimers();

    const configure = vi.fn(() => ({
      authorize: vi.fn(() => new Promise<string>(() => {})),
      storefrontId: "pl"
    }));
    const musicKit = {
      configure,
      getInstance: vi.fn()
    };

    const authorization = getAuthorizedAppleMusicUserToken({
      musicKit,
      developerToken: "developer-token",
      appName: "OrganizeMyMusic",
      appBuild: "mvp",
      authorizeTimeoutMs: 10
    });

    const expectation = expect(authorization).rejects.toThrow("Apple Music authorization did not open");
    await vi.advanceTimersByTimeAsync(10);
    await expectation;

    vi.useRealTimers();
  });
});

describe("createAppleMusicConnectRequest", () => {
  it("posts only the MusicKit token and storefront to the backend", () => {
    const request = createAppleMusicConnectRequest({
      musicUserToken: "music-user-token",
      storefront: "ua"
    });

    expect(request).toEqual({
      url: "/api/apple/connect",
      init: {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          musicUserToken: "music-user-token",
          storefront: "ua"
        })
      }
    });
  });
});
