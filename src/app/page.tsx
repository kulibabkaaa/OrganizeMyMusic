import { Faq } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import { PricingCta } from "@/components/marketing/pricing-cta";
import { PreviewShowcase } from "@/components/marketing/preview-showcase";
import { SiteHeader } from "@/components/marketing/site-header";
import { ValueSections } from "@/components/marketing/value-sections";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <Hero />
      <ValueSections />
      <PreviewShowcase />
      <PricingCta />
      <Faq />
    </>
  );
}

