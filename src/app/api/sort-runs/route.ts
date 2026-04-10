import { NextResponse } from "next/server";

import { fetchAppleLibrarySongs } from "@/modules/apple-music/client";
import { generatePreviewFromRawTracks } from "@/modules/sorts/generate-preview";
import { saveSortRun } from "@/modules/sorts/store";

export async function POST() {
  const rawTracks = await fetchAppleLibrarySongs();
  const sortRun = saveSortRun(await generatePreviewFromRawTracks(rawTracks));

  return NextResponse.json({
    ok: true,
    sortRun
  });
}
