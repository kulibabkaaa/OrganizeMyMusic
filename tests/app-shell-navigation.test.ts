import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { appNavigationItems, isAppNavigationItemActive } from "@/components/app/app-navigation";
import { AppShell } from "@/components/app/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/sorts"
}));

describe("app platform navigation", () => {
  it("contains the canonical platform destinations without Admin", () => {
    expect(appNavigationItems.map((item) => [item.label, item.href])).toEqual([
      ["Dashboard", "/app"],
      ["Playlists", "/app/playlists"],
      ["Library", "/app/library"],
      ["Sorts", "/app/sorts"],
      ["Settings", "/app/settings/libraries"]
    ]);
    expect(appNavigationItems.some((item) => item.label === "Admin")).toBe(false);
    expect(appNavigationItems.some((item) => item.label === "Billing")).toBe(false);
  });

  it("marks the most specific app route as active", () => {
    expect(isAppNavigationItemActive("/app", "/app")).toBe(true);
    expect(isAppNavigationItemActive("/app/playlists", "/app/playlists/new")).toBe(true);
    expect(isAppNavigationItemActive("/app/sorts", "/app/sorts/new")).toBe(true);
    expect(isAppNavigationItemActive("/app/settings/libraries", "/app/settings/libraries")).toBe(true);
    expect(isAppNavigationItemActive("/app", "/app/sorts")).toBe(false);
    expect(isAppNavigationItemActive("/app/library", "/app/playlists")).toBe(false);
  });

  it("renders a keyboard skip link and focusable main landmark", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        AppShell,
        { title: "Sorts", subtitle: "Manage playlist projects." },
        React.createElement("section", null, "Sort list")
      )
    );

    expect(markup).toContain('href="#app-main"');
    expect(markup).toContain('id="app-main"');
    expect(markup).toContain('tabindex="-1"');
    expect(markup).toContain('aria-label="Main app content"');
  });
});
