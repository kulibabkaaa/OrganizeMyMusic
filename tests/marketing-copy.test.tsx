import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Faq } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import { PricingCta } from "@/components/marketing/pricing-cta";
import { PreviewShowcase } from "@/components/marketing/preview-showcase";
import { ValueSections } from "@/components/marketing/value-sections";

describe("marketing platform-first copy", () => {
  it("positions the MVP as review-first playlist management with deferred billing", () => {
    const markup = renderToStaticMarkup(
      <div>
        <Hero />
        <ValueSections />
        <PreviewShowcase />
        <PricingCta />
        <Faq />
      </div>
    );

    expect(markup).toContain("Apple Music organization platform");
    expect(markup).toContain("persistent playlists");
    expect(markup).toContain("saved playlist system");
    expect(markup).toContain("Billing is deferred for the MVP.");
    expect(markup).toContain("Review every track before export.");
    expect(markup).not.toContain("Pay once");
    expect(markup).not.toContain("$19");
    expect(markup).not.toContain("before paying");
  });
});
