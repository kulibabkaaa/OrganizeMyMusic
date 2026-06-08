import { NextResponse } from "next/server";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  getAppleMusicConnectionStatus,
  type SupabaseAppleMusicConnectionReader
} from "@/modules/apple-music/auth";

export async function GET() {
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Apple Music connection storage is not configured." },
      { status: 503 }
    );
  }

  const connectionReader = supabase as unknown as SupabaseAppleMusicConnectionReader;
  const connection = await getAppleMusicConnectionStatus({
    supabase: connectionReader,
    userId: session.user.id
  });

  return NextResponse.json({
    status: connection.status,
    storefront: connection.storefront,
    lastValidatedAt: connection.lastValidatedAt,
    updatedAt: connection.updatedAt
  });
}
