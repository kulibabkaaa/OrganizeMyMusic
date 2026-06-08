import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AppRouteError } from "@/components/app/app-route-error";
import { AppRouteLoading } from "@/components/app/app-route-loading";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/sorts/sort_123/review"
}));

describe("app route loading and error states", () => {
  it("renders a shell loading skeleton with stable accessible status copy", () => {
    const markup = renderToStaticMarkup(<AppRouteLoading title="Loading Sort" />);

    expect(markup).toContain("Loading Sort");
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-label="Loading app content"');
    expect(markup).toContain("animate-pulse");
  });

  it("renders privacy-safe route recovery links", () => {
    const markup = renderToStaticMarkup(
      <AppRouteError reset={() => undefined} description="Try again or leave safely." />
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("The page could not load");
    expect(markup).toContain("Try again");
    expect(markup).toContain('href="/app"');
    expect(markup).toContain("Back to dashboard");
    expect(markup).toContain('href="/app/sorts"');
    expect(markup).toContain("View all Sorts");
    expect(markup).not.toContain("APPLE_PRIVATE_KEY");
  });
});
