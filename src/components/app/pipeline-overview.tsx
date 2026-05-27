import React from "react";

import { StatusPill } from "@/components/ui/status-pill";

const pipeline = [
  ["1", "Connect Apple Music", "Securely connect your Apple Music library."],
  ["2", "Create a Sort", "Describe the playlists you want from music you already saved."],
  ["3", "Preview ready", "Check the likely playlist shape before unlocking full results."],
  ["4", "Processing", "Organize Your Music builds editable playlist results for review."],
  ["5", "Ready for review", "Inspect playlist names and tracks before anything is created."],
  ["6", "Exported", "Create reviewed playlists in Apple Music only after confirmation."]
];

export function PipelineOverview() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-white/45">How it works</p>
            <h2 className="mt-2 font-display text-3xl tracking-[-0.04em]">Your music workspace</h2>
          </div>
          <StatusPill label="Apple Music" tone="accent" />
        </div>

        <div className="mt-8 space-y-5">
          {pipeline.map(([step, title, description]) => (
            <div key={step} className="grid gap-3 border-t border-white/10 pt-5 md:grid-cols-[48px_1fr]">
              <div className="font-display text-3xl tracking-[-0.04em] text-white/25">{step}</div>
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-sm leading-6 text-white/58">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-black/55 p-7 text-white">
        <p className="text-sm uppercase tracking-[0.18em] text-white/45">Library needs attention</p>
        <h3 className="mt-2 font-display text-3xl tracking-[-0.04em]">
          You stay in control from preview to export.
        </h3>
        <p className="mt-5 text-sm leading-7 text-white/68">
          Connect Apple Music, build reusable Sorts, review every playlist, then export only what
          you approve.
        </p>
      </div>
    </section>
  );
}
