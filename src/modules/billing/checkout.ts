import { requireServerEnv } from "@/lib/env";
import { env } from "@/lib/env";
import { getStripe } from "@/modules/billing/stripe";

export async function createSortCheckoutSession(
  sortRunId: string,
  config: Record<string, string | undefined> = env
) {
  if (config.PAYMENTS_ENABLED !== "true" && config.PAYMENTS_DEV_BYPASS_ENABLED === "true") {
    return {
      mode: "dev_bypass",
      checkoutUrl: `/sorts/${sortRunId}?payment=dev_bypass`
    };
  }

  if (config.PAYMENTS_ENABLED !== "true") {
    return {
      mode: "disabled",
      checkoutUrl: null
    };
  }

  const stripe = getStripe();

  if (!stripe) {
    return {
      mode: "disabled",
      checkoutUrl: null
    };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${env.NEXT_PUBLIC_APP_URL}/sorts/${sortRunId}?payment=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/sorts/${sortRunId}?payment=cancelled`,
    line_items: [
      {
        price: requireServerEnv("STRIPE_PRICE_SORT"),
        quantity: 1
      }
    ],
    metadata: {
      sortRunId
    }
  });

  return {
    mode: "live",
    checkoutUrl: session.url
  };
}
