import { redirect } from "next/navigation";

import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseLibrarySyncStore,
  getLatestLibrarySyncStatus
} from "@/modules/library-syncs/queue";
import { createSortDraft, createSupabaseSortDraftStore } from "@/modules/sorts/drafts";

export const dynamic = "force-dynamic";

export default async function NewSortPage() {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    redirect("/auth");
  }

  const supabase = createSupabaseServiceRoleClient();
  const latestSync = supabase
    ? await getLatestLibrarySyncStatus({
        store: createSupabaseLibrarySyncStore(supabase),
        userId: session.user.id
      }).catch(() => null)
    : null;

  if (!supabase) {
    redirect("/app/sorts");
  }

  await ensureProfileForUser(supabase, session.user);
  const result = await createSortDraft({
    store: createSupabaseSortDraftStore(supabase),
    userId: session.user.id,
    input: {
      name: "My Apple Music cleanup",
      sourceProvider: "apple_music",
      librarySyncId: latestSync?.sync.status === "completed" ? latestSync.sync.id : null
    }
  });

  if (result.status !== "created") {
    redirect("/app/sorts");
  }

  redirect(`/app/sorts/${encodeURIComponent(result.sort.id)}/builder`);
}
