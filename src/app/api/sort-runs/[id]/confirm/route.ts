import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await context.params;

  return NextResponse.json(
    {
      error: "Use the reviewed export endpoint to create Apple Music playlists."
    },
    { status: 409 }
  );
}
