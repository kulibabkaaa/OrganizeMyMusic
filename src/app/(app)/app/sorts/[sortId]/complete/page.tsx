import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { ExportCompletePage } from "@/components/app/export/export-complete-page";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabaseSortExportSummaryStore } from "@/modules/sorts/export-progress";

export const dynamic = "force-dynamic";

export default async function SortCompletePage({
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

  if (!summary || summary.state !== "completed") {
    notFound();
  }

  return (
    <AppShell title="Export complete" subtitle="Review the Apple Music playlists created.">
      <ExportCompletePage summary={summary} />
    </AppShell>
  );
}
