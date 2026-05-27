import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { BillingPage } from "@/components/app/billing/billing-page";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseBillingStore,
  listBillingSummary
} from "@/modules/payments/list-payments";

export const dynamic = "force-dynamic";

export default async function AppBillingPage() {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    redirect("/auth");
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    notFound();
  }

  const summary = await listBillingSummary({
    store: createSupabaseBillingStore(supabase),
    userId: session.user.id
  });

  return (
    <AppShell title="Billing" subtitle="Pay-per-Sort billing and history.">
      <BillingPage summary={summary} />
    </AppShell>
  );
}
