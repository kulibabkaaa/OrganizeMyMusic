import { NextResponse } from "next/server";

import { createSortCheckoutSession } from "@/modules/billing/checkout";
import { markSortRunPaid } from "@/modules/sorts/store";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await createSortCheckoutSession(id);

  if (session.mode === "mock") {
    markSortRunPaid(id);
  }

  return NextResponse.json({
    ok: true,
    ...session
  });
}
