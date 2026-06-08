import { Faq } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import { PricingCta } from "@/components/marketing/pricing-cta";
import { PreviewShowcase } from "@/components/marketing/preview-showcase";
import { SiteHeader } from "@/components/marketing/site-header";
import { ValueSections } from "@/components/marketing/value-sections";
import { getAuthenticatedSession, getLandingCtaRoutes } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getAuthenticatedSession();
  const ctaRoutes = getLandingCtaRoutes(session.status);

  return (
    <>
      <SiteHeader openAppHref={ctaRoutes.openAppHref} />
      <Hero startSortHref={ctaRoutes.startSortHref} />
      <ValueSections />
      <PreviewShowcase />
      <PricingCta connectHref={ctaRoutes.openAppHref} />
      <Faq />
    </>
  );
}
