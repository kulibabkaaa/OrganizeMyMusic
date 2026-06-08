import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ensureProfileForUser } from "@/lib/auth/profile";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseLibrarySyncStore,
  getLatestLibrarySyncStatus
} from "@/modules/library-syncs/queue";
import { createSortDraft, createSupabaseSortDraftStore } from "@/modules/sorts/drafts";

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json({ error: "Sort draft storage is not configured." }, { status: 503 });
  }

  try {
    await ensureProfileForUser(supabase, session.user);
    const body = await request.json().catch(() => null);
    const latestSync = await getLatestLibrarySyncStatus({
      store: createSupabaseLibrarySyncStore(supabase),
      userId: session.user.id
    }).catch(() => null);
    const draftInput =
      typeof body === "object" && body
        ? {
            ...body,
            librarySyncId:
              "librarySyncId" in body
                ? (body as { librarySyncId?: unknown }).librarySyncId
                : latestSync?.sync.status === "completed"
                  ? latestSync.sync.id
                  : null
          }
        : body;
    const result = await createSortDraft({
      store: createSupabaseSortDraftStore(supabase),
      userId: session.user.id,
      input: draftInput
    });

    if (result.status === "missing_library_sync") {
      return NextResponse.json({ error: "Library sync not found." }, { status: 404 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid Sort draft payload." }, { status: 400 });
    }

    throw error;
  }
}
