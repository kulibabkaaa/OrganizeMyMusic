import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { PreviewPaywallPage } from "@/components/app/preview/preview-paywall-page";
import { Card } from "@/components/ui/card";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { createSupabaseSortDraftStore } from "@/modules/sorts/drafts";
import {
  createSupabaseLightweightPreviewStore,
  generateAndStoreLightweightPreview
} from "@/modules/sorts/lightweight-preview";

export const dynamic = "force-dynamic";

export default async function SortPreviewPage({
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

  const preview = await generateAndStoreLightweightPreview({
    store: createSupabaseLightweightPreviewStore(supabase),
    sortRunId: sort.id,
    userId: session.user.id
  });

  if (preview.status === "created" || preview.status === "existing") {
    return (
      <AppShell
        title="Preview Sort"
        subtitle="Review likely playlist output before starting full processing."
      >
        <PreviewPaywallPage sortName={sort.name} snapshot={preview.snapshot} />
      </AppShell>
    );
  }

  if (preview.status === "immutable" && preview.snapshot) {
    return (
      <AppShell
        title="Preview Sort"
        subtitle="Review likely playlist output before starting full processing."
      >
        <PreviewPaywallPage sortName={sort.name} snapshot={preview.snapshot} />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Preview Sort"
      subtitle="Preview needs a completed library sync and at least one Playlist Recipe."
    >
      <Card>
        <h1 className="font-display text-3xl font-semibold tracking-[0em] text-white">
          Preview is not ready
        </h1>
        <p className="mt-3 text-sm leading-7 text-platform-secondary">
          {messageForPreviewStatus(preview.status)}
        </p>
      </Card>
    </AppShell>
  );
}

function messageForPreviewStatus(status: Exclude<Awaited<ReturnType<typeof generateAndStoreLightweightPreview>>["status"], "created" | "existing">) {
  if (status === "empty_recipes") {
    return "Add at least one Playlist Recipe before previewing this Sort.";
  }

  if (status === "missing_library_sync") {
    return "Connect and sync Apple Music before previewing this Sort.";
  }

  if (status === "immutable") {
    return "Preview is locked for this Sort.";
  }

  return "Sort draft not found.";
}
