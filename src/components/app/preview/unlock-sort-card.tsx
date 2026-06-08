import React from "react";
import Link from "next/link";
import type { Route } from "next";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";

export function UnlockSortCard({
  sortId,
  playlistCount
}: {
  sortId: string;
  playlistCount: number;
}) {
  return (
    <Card elevated className="sticky top-6 space-y-5 self-start">
      <StatusPill label="Billing deferred" tone="success" />
      <div>
        <h2 className="font-display text-3xl font-semibold tracking-[0em] text-white">
          Start full Sort
        </h2>
        <p className="mt-3 text-sm leading-7 text-platform-secondary">
          Run the full library analysis and review every generated playlist before anything is created in Apple Music.
        </p>
      </div>

      <dl className="grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <dt className="text-platform-secondary">Previewed playlists</dt>
          <dd className="font-mono text-white">{playlistCount}</dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-platform-secondary">
          Full library analysis
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-platform-secondary">
          Editable results before export
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-platform-secondary">
          Apple Music export controls
        </div>
      </dl>

      <Link
        href={`/app/sorts/${encodeURIComponent(sortId)}/checkout` as Route}
        className="inline-flex w-full items-center justify-center rounded-full bg-accent-sweep px-5 py-3 text-sm font-semibold text-white shadow-pulse transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
      >
        Start full Sort
      </Link>
    </Card>
  );
}
