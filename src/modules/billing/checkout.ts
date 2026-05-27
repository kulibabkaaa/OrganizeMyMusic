import { requireServerEnv } from "@/lib/env";
import { env } from "@/lib/env";
import { getStripe } from "@/modules/billing/stripe";
import { getCheckoutMode } from "@/modules/payments/checkout";

export type SortCheckoutSession =
  | {
      mode: "disabled";
      checkoutUrl: null;
    }
  | {
      mode: "dev_bypass";
      checkoutUrl: string;
    }
  | {
      mode: "live";
      checkoutUrl: string | null;
    };

export async function createSortCheckoutSession(
  sortRunId: string,
  config: Record<string, string | undefined> = env
): Promise<SortCheckoutSession> {
  const mode = getCheckoutMode(config);

  if (mode === "disabled") {
    return {
      mode: "disabled",
      checkoutUrl: null
    };
  }

  if (mode === "dev_bypass") {
    return {
      mode: "dev_bypass",
      checkoutUrl: `/sorts/${sortRunId}?payment=dev_bypass`
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
