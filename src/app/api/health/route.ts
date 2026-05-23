import { NextResponse } from "next/server";

import { getDeploymentRevision } from "@/lib/deployment-revision";

export function GET() {
  return NextResponse.json({
    ok: true,
    component: "web",
    revision: getDeploymentRevision()
  });
}
