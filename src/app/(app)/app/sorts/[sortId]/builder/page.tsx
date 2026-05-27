import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { SortBuilder } from "@/components/app/sort-builder/sort-builder";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabasePlaylistRecipeStore } from "@/modules/playlist-recipes/store";
import { createSupabaseSortDraftStore, getPreviewReadiness } from "@/modules/sorts/drafts";

export const dynamic = "force-dynamic";

export default async function SortBuilderPage({
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
  const sortStore = createSupabaseSortDraftStore(supabase);
  const sort = await sortStore.getSortDraft({
    userId: session.user.id,
    sortId
  });

  if (!sort) {
    notFound();
  }

  const [recipes, sync] = await Promise.all([
    createSupabasePlaylistRecipeStore(supabase).listRecipesForSort({
      userId: session.user.id,
      sortRunId: sort.id
    }),
    sort.librarySyncId
      ? sortStore.getLibrarySyncForUser({
          userId: session.user.id,
          librarySyncId: sort.librarySyncId
        })
      : Promise.resolve(null)
  ]);

  return (
    <AppShell
      title="Sort builder"
      subtitle="Edit playlist plans, save the draft, and preview only when the library index is ready."
    >
      <SortBuilder
        mode="edit"
        initialSort={sort}
        initialRecipes={recipes}
        preview={getPreviewReadiness(sync?.status ?? null)}
      />
    </AppShell>
  );
}
