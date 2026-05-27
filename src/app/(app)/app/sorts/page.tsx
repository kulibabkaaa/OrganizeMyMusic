import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { SortsIndex, parseSortIndexFilter } from "@/components/app/sorts/sorts-index";
import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseRecentSortRunStore,
  type RecentSortRunSummary
} from "@/modules/sorts/list-sort-runs";

export const dynamic = "force-dynamic";

export default async function AppSortsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    redirect("/auth");
  }

  const serviceSupabase = createSupabaseServiceRoleClient();
  let sorts: RecentSortRunSummary[] = [];

  if (serviceSupabase) {
    await ensureProfileForUser(serviceSupabase, session.user);

    try {
      sorts = await createSupabaseRecentSortRunStore(serviceSupabase).listSortRuns({
        userId: session.user.id
      });
    } catch {
      sorts = [];
    }
  }

  const { status } = await searchParams;

  return (
    <AppShell
      title="Sorts"
      subtitle="Browse every reusable Sort and jump to the next safe step for each one."
    >
      <SortsIndex sorts={sorts} selectedFilter={parseSortIndexFilter(status)} />
    </AppShell>
  );
}
