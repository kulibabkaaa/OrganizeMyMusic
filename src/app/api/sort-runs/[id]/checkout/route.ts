import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return NextResponse.json({
    error: "Legacy checkout is disabled. Start full-library organization from the platform workflow.",
    nextPath: `/app/sorts/${encodeURIComponent(id)}/start`,
    nextApiPath: `/api/app/sorts/${encodeURIComponent(id)}/start`
  }, { status: 409 });
}
