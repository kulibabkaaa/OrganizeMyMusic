import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { ExportingPage } from "@/components/app/export/exporting-page";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabaseSortExportSummaryStore } from "@/modules/sorts/export-progress";

export const dynamic = "force-dynamic";

export default async function SortExportingPage({
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
  const summary = await createSupabaseSortExportSummaryStore(supabase).getExportSummary({
    sortId,
    userId: session.user.id
  });

  if (!summary) {
    notFound();
  }

  return (
    <AppShell title="Exporting" subtitle="Track Apple Music export progress.">
      <ExportingPage summary={summary} />
    </AppShell>
  );
}
