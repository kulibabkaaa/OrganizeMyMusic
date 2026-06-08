import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await context.params;
  return NextResponse.json({
    error: "Use the platform full-organization start endpoint."
  }, { status: 409 });
}
