import { NextResponse } from "next/server";

import { createAppleMusicPlaylists } from "@/modules/apple-music/playlists";
import { getStoredSortRun, markSortRunCompleted } from "@/modules/sorts/store";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const sortRun = getStoredSortRun(id);

  if (!sortRun) {
    return NextResponse.json({ error: "Sort run not found." }, { status: 404 });
  }

  if (sortRun.paymentStatus !== "paid") {
    return NextResponse.json(
      { error: "Payment must succeed before playlist creation." },
      { status: 409 }
    );
  }

  const result = await createAppleMusicPlaylists(sortRun.playlists);
  markSortRunCompleted(id);

  return NextResponse.json({
    ok: true,
    result
  });
}
