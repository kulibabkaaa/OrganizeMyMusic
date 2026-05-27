import { NextResponse } from "next/server";

import { createSortCheckoutSession } from "@/modules/billing/checkout";
import { markSortRunPaid } from "@/modules/sorts/store";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await createSortCheckoutSession(id);

  if (session.mode === "disabled") {
    return NextResponse.json(
      {
        ok: false,
        error: "Checkout is disabled."
      },
      { status: 409 }
    );
  }

  if (session.mode === "dev_bypass") {
    markSortRunPaid(id);
  }

  return NextResponse.json({
    ok: true,
    ...session
  });
}
