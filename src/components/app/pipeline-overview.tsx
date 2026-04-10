import { StatusPill } from "@/components/ui/status-pill";

const pipeline = [
  ["1", "Connect Apple Music", "Browser MusicKit sign-in and encrypted token persistence."],
  ["2", "Ingest library", "Read library songs, store raw payloads, and track progress."],
  ["3", "Normalize and dedupe", "Collapse duplicates and create a stable canonical fingerprint."],
  ["4", "Classify tracks", "Use heuristics first and AI only where it adds value."],
  ["5", "Preview + pay", "Show playlist bundles before a one-time checkout."],
  ["6", "Create playlists", "Require one manual confirmation before writing to Apple Music."]
];

export function PipelineOverview() {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[2rem] bg-white p-7 shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-black/45">Sort pipeline</p>
            <h2 className="mt-2 font-display text-3xl tracking-[-0.04em]">Operational view</h2>
          </div>
          <StatusPill label="MVP flow" tone="accent" />
        </div>

        <div className="mt-8 space-y-5">
          {pipeline.map(([step, title, description]) => (
            <div key={step} className="grid gap-3 border-t border-black/8 pt-5 md:grid-cols-[48px_1fr]">
              <div className="font-display text-3xl tracking-[-0.04em] text-black/25">{step}</div>
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-sm leading-6 text-black/58">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[2rem] bg-black p-7 text-white">
        <p className="text-sm uppercase tracking-[0.18em] text-white/45">Why this shape</p>
        <h3 className="mt-2 font-display text-3xl tracking-[-0.04em]">
          Small enough to launch, explicit enough to support.
        </h3>
        <p className="mt-5 text-sm leading-7 text-white/68">
          The system keeps the backend modular but concrete: one repo, one database, one worker,
          and a fixed output bundle that can be improved with real user feedback.
        </p>
      </div>
    </section>
  );
}

