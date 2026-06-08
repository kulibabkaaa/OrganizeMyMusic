import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { ProcessingPage } from "@/components/app/processing/processing-page";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabasePlaylistRecipeStore } from "@/modules/playlist-recipes/store";
import { createSupabaseSortDraftStore } from "@/modules/sorts/drafts";
import { getSortProcessingProgress } from "@/modules/sorts/progress";
import { createSupabasePreviewSnapshotStore } from "@/modules/sorts/preview-snapshot";

export const dynamic = "force-dynamic";

export default async function SortProcessingPage({
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

  const recipeStore = createSupabasePlaylistRecipeStore(supabase);
  const previewStore = createSupabasePreviewSnapshotStore(supabase);
  const [recipes, previewSort, trackCountProcessed, generatedPlaylistCount] = await Promise.all([
    recipeStore.listRecipesForSort({
      userId: session.user.id,
      sortRunId: sort.id
    }),
    previewStore.getSortRunForPreview({
      userId: session.user.id,
      sortRunId: sort.id
    }),
    getTrackCountProcessed({
      supabase,
      userId: session.user.id,
      librarySyncId: sort.librarySyncId
    }),
    getGeneratedPlaylistCount({
      supabase,
      sortRunId: sort.id
    })
  ]);
  const progress = getSortProcessingProgress({
    state: sort.state,
    paymentStatus: sort.paymentStatus,
    recipeCount: recipes.length,
    trackCountProcessed,
    generatedPlaylistCount,
    activeJobStages: previewSort?.events?.map((event) => event.stage) ?? []
  });

  return (
    <AppShell
      title="Processing"
      subtitle="Track full-organization progress. Apple Music export still requires review."
    >
      <ProcessingPage sortId={sort.id} sortName={sort.name} progress={progress} />
    </AppShell>
  );
}

async function getTrackCountProcessed(input: {
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>;
  userId: string;
  librarySyncId: string | null;
}) {
  if (!input.supabase || !input.librarySyncId) {
    return 0;
  }

  const { data, error } = await input.supabase
    .from("library_syncs")
    .select("normalized_track_count,raw_track_count")
    .eq("id", input.librarySyncId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (error || !data) {
    return 0;
  }

  return Number(data.normalized_track_count ?? data.raw_track_count ?? 0);
}

async function getGeneratedPlaylistCount(input: {
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>;
  sortRunId: string;
}) {
  if (!input.supabase) {
    return 0;
  }

  const { count, error } = await input.supabase
    .from("sort_playlists")
    .select("id", { count: "exact", head: true })
    .eq("sort_run_id", input.sortRunId);

  if (error) {
    return 0;
  }

  return count ?? 0;
}
