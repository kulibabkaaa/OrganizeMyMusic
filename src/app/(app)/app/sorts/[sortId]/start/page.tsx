import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { SortStartPage } from "@/components/app/sort-start/sort-start-page";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabasePaymentStore,
  getCheckoutMode,
  getSortStartReadiness,
  summarizeCheckout
} from "@/modules/payments/checkout";

export const dynamic = "force-dynamic";

export default async function SortStartRoute({
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
  const readiness = getSortStartReadiness(sort);

  return (
    <AppShell
      title="Start full library organization"
      subtitle="Review the full-library organization plan before processing starts."
    >
      <SortStartPage sortId={sort.id} mode={mode} summary={summary} readiness={readiness} />
    </AppShell>
  );
}
