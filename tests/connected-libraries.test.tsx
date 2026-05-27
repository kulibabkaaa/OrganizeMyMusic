import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AppleMusicLibraryCard } from "@/components/app/library/apple-music-library-card";
import { ComingSoonProviderCard } from "@/components/app/library/coming-soon-provider-card";
import { ConnectedLibrariesPage } from "@/components/app/library/connected-libraries-page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/settings/libraries",
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}));

const connectedLibrary = {
  connection: {
    id: "connection_1",
    status: "connected" as const,
    storefront: "us"
  },
  latestSync: {
    id: "sync_1",
    userId: "user_1",
    status: "completed" as const,
    rawTrackCount: 19960,
    normalizedTrackCount: 19640,
    duplicateCount: 320,
    errorSummary: null,
    createdAt: "2026-05-26T08:00:00.000Z",
    updatedAt: "2026-05-26T10:42:00.000Z"
  }
};

describe("connected libraries page", () => {
  it("renders Apple Music access, sync status, actions, disabled providers, and access note", () => {
    const markup = renderToStaticMarkup(
      <ConnectedLibrariesPage
        appleMusicConnection={connectedLibrary.connection}
        latestSync={connectedLibrary.latestSync}
      />
    );

    expect(markup).toContain("Connected libraries");
    expect(markup).toContain("Apple Music");
    expect(markup).toContain("Connected");
    expect(markup).toContain("Last successful sync");
    expect(markup).toContain("Latest status");
    expect(markup).toContain("Sync complete");
    expect(markup).toContain("Tracks read");
    expect(markup).toContain("Songs indexed");
    expect(markup).toContain("19,640");
    expect(markup).toContain("Start background sync");
    expect(markup).toContain("Refresh status");
    expect(markup).toContain("Reconnect");
    expect(markup).toContain("Disconnect");
    expect(markup).toContain('aria-describedby="apple-music-disconnect-disabled-reason"');
    expect(markup).toContain("Disconnect is paused for MVP safety.");
    expect(markup).toContain("Spotify");
    expect(markup).toContain("YouTube Music");
    expect(markup).toContain("Coming later");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain(
      "Organize Your Music reads library metadata to classify tracks. Playlist creation requires your review and explicit export action."
    );
  });

  it("renders Apple Music disconnected state with a connect action", () => {
    const markup = renderToStaticMarkup(
      <AppleMusicLibraryCard appleMusicConnection={null} latestSync={null} />
    );

    expect(markup).toContain("Not connected");
    expect(markup).toContain("Connect Apple Music");
    expect(markup).toContain('aria-describedby="apple-music-connect-status"');
    expect(markup).toContain("Preparing Apple Music connection...");
    expect(markup).toContain("No successful sync yet.");
    expect(markup).toContain("Not started");
  });

  it("renders failed Apple Music sync with retry path and last error", () => {
    const markup = renderToStaticMarkup(
      <AppleMusicLibraryCard
        appleMusicConnection={connectedLibrary.connection}
        latestSync={{
          ...connectedLibrary.latestSync,
          status: "failed",
          rawTrackCount: 240,
          normalizedTrackCount: 0,
          errorSummary: "Apple Music rejected the request."
        }}
      />
    );

    expect(markup).toContain("Sync failed");
    expect(markup).toContain("Last error");
    expect(markup).toContain("Apple Music rejected the request.");
    expect(markup).toContain("Retry sync");
    expect(markup).toContain("Refresh status");
  });

  it("renders coming-soon providers as disabled", () => {
    const markup = renderToStaticMarkup(<ComingSoonProviderCard name="Spotify" />);

    expect(markup).toContain("Spotify");
    expect(markup).toContain("Coming later");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("aria-disabled");
  });
});
