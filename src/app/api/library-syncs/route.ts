import { NextResponse } from "next/server";

import { syncAppleLibrary } from "@/modules/apple-music/library";

export async function POST() {
  const sync = await syncAppleLibrary();

  return NextResponse.json({
    ok: true,
    sync
  });
}

