import React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import type { LatestSortRunSummary } from "@/modules/sorts/latest-run";

function formatState(label: string) {
  return label.replaceAll("_", " ");
}

export function LatestSortRunCard({
  latestSortRun,
  error
}: {
  latestSortRun: LatestSortRunSummary | null;
  error?: string | null;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-white/42">Latest organization</p>
          <h2 className="mt-3 font-display text-3xl tracking-[-0.04em]">
            {latestSortRun ? "Review the latest preview." : "No preview yet."}
          </h2>
        </div>
        <StatusPill
          label={latestSortRun ? formatState(latestSortRun.state) : "waiting"}
          tone={latestSortRun ? "accent" : "inverse"}
        />
      </div>

      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62">
        {latestSortRun
          ? "Open the latest preview to inspect playlists, confirmation state, and quality triage."
          : "Save playlist requests after a completed sync to generate a preview."}
      </p>

      {error ? <p className="mt-3 text-sm leading-6 text-amber-100">{error}</p> : null}

      {latestSortRun ? (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-black/24 p-4">
              <p className="text-2xl font-semibold">{latestSortRun.playlistCount}</p>
              <p className="mt-1 text-sm text-white/54">playlists</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/24 p-4">
              <p className="text-2xl font-semibold">{latestSortRun.selectedPlaylistCount}</p>
              <p className="mt-1 text-sm text-white/54">selected</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/24 p-4">
              <p className="text-2xl font-semibold">{latestSortRun.trackAssignmentCount}</p>
              <p className="mt-1 text-sm text-white/54">tracks</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/24 p-4">
              <p className="text-2xl font-semibold">{latestSortRun.applePlaylistIdCount}</p>
              <p className="mt-1 text-sm text-white/54">Exported</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href={`/sorts/${latestSortRun.id}`} className="inline-flex">
              <Button variant="secondary">Open preview</Button>
            </Link>
            <span className="text-sm text-white/48">Project ID: {latestSortRun.id}</span>
          </div>
        </>
      ) : null}
    </section>
  );
}
