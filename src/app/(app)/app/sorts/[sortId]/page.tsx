import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { getAuthenticatedSession } from "@/lib/auth/session";
import { getSortPreview } from "@/modules/sorts/service";
import { getSortPrimaryRoute, getSortUiStatus } from "@/modules/sorts/ui-status";

export const dynamic = "force-dynamic";

export default async function AppSortStatusPage({
  params
}: {
  params: Promise<{ sortId: string }>;
}) {
  const { sortId } = await params;
  const session = await getAuthenticatedSession();

  if (session.status !== "authenticated") {
    redirect("/auth");
  }

  const previewResult = await getSortPreview(sortId, session.user.id);

  if (previewResult.status === "not_found") {
    notFound();
  }

  if (previewResult.status !== "ready") {
    redirect(`/app/sorts/${encodeURIComponent(sortId)}/builder` as Route);
  }

  const status = getSortUiStatus({
    state: previewResult.sortRun.state,
    paymentStatus: previewResult.sortRun.paymentStatus,
    hasPreviewSnapshot: Boolean(previewResult.sortRun.previewSnapshot),
    generatedPlaylistCount: previewResult.sortRun.generatedPlaylistCount ?? 0,
    applePlaylistIdCount: previewResult.sortRun.applePlaylistIdCount ?? 0,
    activeJobStages: previewResult.sortRun.events?.map((event) => event.stage) ?? []
  });

  redirect(getSortPrimaryRoute(sortId, status) as Route);
}
