import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return NextResponse.json(
    {
      error: "Legacy playlist creation is disabled. Use the platform review export flow to create Apple Music playlists and add approved tracks.",
      nextPath: `/app/sorts/${encodeURIComponent(id)}/review`,
      nextApiPath: `/api/app/sorts/${encodeURIComponent(id)}/export`
    },
    { status: 409 }
  );
}
