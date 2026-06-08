import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  createSupabaseNewMusicStore,
  processNewMusic
} from "@/modules/library-syncs/new-music";

export async function POST() {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "New music processing is not configured." },
      { status: 503 }
    );
  }

  const result = await processNewMusic({
    store: createSupabaseNewMusicStore(supabase),
    userId: session.user.id
  });

  if (result.status === "not_ready") {
    return NextResponse.json(result, { status: 409 });
  }

  return NextResponse.json(result);
}
