import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getStripe } from "@/modules/billing/stripe";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  const stripe = getStripe();

  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({
      ok: true,
      mode: "mock"
    });
  }

  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe signature." }, { status: 400 });
  }

  const event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);

  return NextResponse.json({
    ok: true,
    type: event.type
  });
}

