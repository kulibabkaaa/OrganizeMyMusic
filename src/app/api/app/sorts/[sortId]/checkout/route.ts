import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { withPgBoss } from "@/lib/pg-boss";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createStripeCheckoutForSort,
  createSupabasePaymentStore,
  getCheckoutMode,
  unlockSortWithDeferredBilling,
  unlockSortWithDevBypass
} from "@/modules/payments/checkout";
import {
  createSupabaseFullSortStore,
  queueFullSortAfterPayment
} from "@/modules/sorts/full-sort-job";

export async function POST(
  _request: Request,
  context: { params: Promise<{ sortId: string }> }
) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const mode = getCheckoutMode();

  if (mode === "disabled") {
    return NextResponse.json(
      { error: "Full organization start is not enabled for this Sort." },
      { status: 409 }
    );
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Full organization storage is not configured." },
      { status: 503 }
    );
  }

  const { sortId } = await context.params;

  if (mode === "deferred" || mode === "dev_bypass") {
    const result = await withPgBoss(async (queue) => {
      const store = createSupabasePaymentStore(supabase);
      const payment =
        mode === "deferred"
          ? await unlockSortWithDeferredBilling({
              store,
              sortRunId: sortId,
              userId: session.user.id
            })
          : await unlockSortWithDevBypass({
              store,
              sortRunId: sortId,
              userId: session.user.id
            });

      if (payment.status === "not_found") {
        return {
          payment,
          fullSort: null
        };
      }

      return {
        payment,
        fullSort: await queueFullSortAfterPayment({
          store: createSupabaseFullSortStore(supabase),
          queue,
          sortRunId: sortId,
          userId: session.user.id
        })
      };
    });

    if (!result) {
      return NextResponse.json(
        { error: "Full organization queue is not configured." },
        { status: 503 }
      );
    }

    if (result.payment.status === "not_found") {
      return NextResponse.json({ error: result.payment.message }, { status: 404 });
    }

    if (result.fullSort?.status === "not_ready") {
      return NextResponse.json({ error: result.fullSort.message }, { status: 409 });
    }

    return NextResponse.json({
      status: result.payment.status,
      mode,
      processingUrl: result.payment.processingUrl,
      fullSort: result.fullSort
        ? {
            status: result.fullSort.status,
            ...("jobId" in result.fullSort ? { jobId: result.fullSort.jobId } : {})
          }
        : null
    });
  }

  const checkout = await createStripeCheckoutForSort({ sortRunId: sortId });

  if (!checkout?.checkoutUrl) {
    return NextResponse.json(
      { error: "Stripe checkout is not configured." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "checkout_created",
    mode,
    checkoutUrl: checkout.checkoutUrl
  });
}
