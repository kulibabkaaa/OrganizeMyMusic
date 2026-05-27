import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DashboardEmpty } from "@/components/app/dashboard/dashboard-empty";
import { ProviderCard } from "@/components/app/library/provider-card";
import { Button } from "@/components/ui/button";

describe("dashboard empty state", () => {
  it("renders the no-library dashboard setup state", () => {
    const markup = renderToStaticMarkup(
      <DashboardEmpty connectAction={<Button>Connect Apple Music</Button>} />
    );

    expect(markup).toContain("Your music workspace");
    expect(markup).toContain("Create a Sort");
    expect(markup).toContain("disabled");
    expect(markup).toContain('aria-describedby="create-sort-disabled-reason"');
    expect(markup).toContain("Connect Apple Music before creating a Sort.");
    expect(markup).toContain("Connect your first music library");
    expect(markup).toContain(
      "Connect Apple Music so Organize Your Music can read your library and prepare it for sorting."
    );
    expect(markup).toContain("Apple Music");
    expect(markup).toContain("Available now");
    expect(markup).toContain("Spotify");
    expect(markup).toContain("Coming later");
    expect(markup).toContain("YouTube Music");
    expect(markup).toContain("Recent Sorts");
    expect(markup).toContain("Library Status");
    expect(markup).toContain("Connect a library first");
  });

  it("renders available and disabled provider cards", () => {
    const markup = renderToStaticMarkup(
      <div>
        <ProviderCard name="Apple Music" status="Available now" availability="available" />
        <ProviderCard name="Spotify" status="Coming later" availability="coming_later" />
      </div>
    );

    expect(markup).toContain("Apple Music");
    expect(markup).toContain("Available now");
    expect(markup).toContain("Ready");
    expect(markup).toContain("Spotify");
    expect(markup).toContain("Coming later");
    expect(markup).toContain("Disabled");
  });
});
