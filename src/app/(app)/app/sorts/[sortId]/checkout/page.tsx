import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { CheckoutPage } from "@/components/app/checkout/checkout-page";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabasePaymentStore,
  getCheckoutMode,
  summarizeCheckout
} from "@/modules/payments/checkout";

export const dynamic = "force-dynamic";

export default async function SortCheckoutPage({
  params
}: {
  params: Promise<{ sortId: string }>;
}) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    redirect("/auth");
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    notFound();
  }

  const { sortId } = await params;
  const store = createSupabasePaymentStore(supabase);
  const sort = await store.getSortForCheckout({
    userId: session.user.id,
    sortRunId: sortId
  });

  if (!sort) {
    notFound();
  }

  const mode = getCheckoutMode();
  const summary = summarizeCheckout({
    sortName: sort.name,
    recipeCount: sort.recipeCount,
    estimatedTrackCount: sort.estimatedTrackCount,
    mode
  });

  return (
    <AppShell
      title="Start full Sort"
      subtitle="Review the full-library organization plan before processing starts."
    >
      <CheckoutPage sortId={sort.id} mode={mode} summary={summary} />
    </AppShell>
  );
}
