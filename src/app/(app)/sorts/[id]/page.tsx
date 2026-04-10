import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { SortRunActions } from "@/components/app/sort-run-actions";
import { SortRunPanel } from "@/components/app/sort-run-panel";
import { getSortPreview } from "@/modules/sorts/service";

export const dynamic = "force-dynamic";

export default async function SortRunPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sortRun = await getSortPreview(id);

  if (!sortRun) {
    notFound();
  }

  return (
    <AppShell title="Sort run" subtitle="Preview, payment state, and Apple playlist creation live here.">
      <div className="space-y-6">
        <SortRunActions sortRun={sortRun} />
        <SortRunPanel sortRun={sortRun} />
      </div>
    </AppShell>
  );
}
