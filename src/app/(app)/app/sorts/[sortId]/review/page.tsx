import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { ReviewPlaylistsPage } from "@/components/app/review/review-playlists-page";
import { Card } from "@/components/ui/card";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabaseSortDraftStore } from "@/modules/sorts/drafts";
import { loadStoredFullSortReviewSnapshot } from "@/modules/sorts/full-sort-job";
import {
  createSupabasePreviewSnapshotStore,
  type PreviewSnapshot
} from "@/modules/sorts/preview-snapshot";

export const dynamic = "force-dynamic";

export default async function SortReviewPage({
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

  const previewSort = await createSupabasePreviewSnapshotStore(supabase).getSortRunForPreview({
    userId: session.user.id,
    sortRunId: sort.id
  });

  if (!previewSort) {
    notFound();
  }

  const reviewSnapshot = isFullPreviewSnapshot(previewSort.previewSnapshot)
    ? previewSort.previewSnapshot
    : await loadStoredFullSortReviewSnapshot({
        supabase,
        sortRunId: sort.id,
        librarySyncId: sort.librarySyncId
      });

  if (!reviewSnapshot) {
    return (
      <AppShell
        title="Review"
        subtitle="Review generated playlists before Apple Music export."
      >
        <Card>
          <h1 className="font-display text-3xl font-semibold tracking-[0em] text-white">
            Review is not ready
          </h1>
          <p className="mt-3 text-sm leading-7 text-platform-secondary">
            Full-organization results are needed before review. Apple Music export still requires explicit confirmation.
          </p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Review" subtitle="Review generated playlists before Apple Music export.">
      <ReviewPlaylistsPage sortId={sort.id} sortName={sort.name} snapshot={reviewSnapshot} />
    </AppShell>
  );
}

function isFullPreviewSnapshot(snapshot: PreviewSnapshot | null): snapshot is PreviewSnapshot {
  return Boolean(
    snapshot &&
      Array.isArray(snapshot.playlists) &&
      snapshot.playlists.every((playlist) => Array.isArray(playlist.tracks))
  );
}
