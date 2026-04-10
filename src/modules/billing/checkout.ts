import { requireServerEnv } from "@/lib/env";
import { env } from "@/lib/env";
import { getStripe } from "@/modules/billing/stripe";

export async function createSortCheckoutSession(sortRunId: string) {
  const stripe = getStripe();

  if (!stripe) {
    return {
      mode: "mock",
      checkoutUrl: `/sorts/${sortRunId}?payment=mock`
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
