import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { formatRelativeStatus } from "@/lib/utils";
import { getAdminSortRun } from "@/modules/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminSortRunPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { run, events } = await getAdminSortRun(id);

  if (!run) {
    notFound();
  }

  return (
    <AppShell title="Run inspection" subtitle="Internal debug visibility for early user support.">
      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[2rem] border border-black/8 bg-white p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-black/42">Lifecycle</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <StatusPill label={run.state.replaceAll("_", " ")} tone="accent" />
            <StatusPill label={run.paymentStatus} tone="neutral" />
          </div>
          <div className="mt-8 space-y-5 text-sm text-black/62">
            <div>
              <p className="text-black">Playlists in preview</p>
              <p>{run.playlists.length}</p>
            </div>
            <div>
              <p className="text-black">Last updated</p>
              <p>{formatRelativeStatus(run.updatedAt)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-white p-6">
          <p className="text-sm uppercase tracking-[0.18em] text-black/42">Structured events</p>
          <div className="mt-6 space-y-4">
            {events.map((event) => (
              <div key={event.id} className="border-t border-black/8 pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium">{event.stage}</p>
                  <span className="text-xs uppercase tracking-[0.18em] text-black/45">
                    {formatRelativeStatus(event.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-black/62">{event.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
