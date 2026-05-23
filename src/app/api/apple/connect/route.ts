import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { persistAppleMusicUserToken } from "@/modules/apple-music/auth";
import { acceptAppleMusicConnection, parseAppleMusicConnectPayload } from "@/modules/apple-music/connect";

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const payload = parseAppleMusicConnectPayload(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid Apple Music connection payload." }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Apple Music connection storage is not configured." },
      { status: 503 }
    );
  }

  const persisted = await persistAppleMusicUserToken({
    supabase,
    userId: session.user.id,
    ...payload.data
  });

  if (persisted.status === "error") {
    return NextResponse.json({ error: persisted.message }, { status: 500 });
  }

  return NextResponse.json(
    acceptAppleMusicConnection({
      userId: session.user.id,
      ...payload.data
    })
  );
}
