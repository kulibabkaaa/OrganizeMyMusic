import Stripe from "stripe";

import { env, requireServerEnv } from "@/lib/env";

let stripe: Stripe | null = null;

export function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }

  if (!stripe) {
    stripe = new Stripe(requireServerEnv("STRIPE_SECRET_KEY"), {
      apiVersion: "2025-02-24.acacia"
    });
  }

  return stripe;
}

