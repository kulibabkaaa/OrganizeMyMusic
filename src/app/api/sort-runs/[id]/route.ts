import { NextResponse } from "next/server";

import { getSortPreview } from "@/modules/sorts/service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const sortRun = await getSortPreview(id);

  if (!sortRun) {
    return NextResponse.json({ error: "Sort run not found." }, { status: 404 });
  }

  return NextResponse.json(sortRun);
}

