import Link from "next/link";

import { Button } from "@/components/ui/button";

const stats = [
  { value: "3 min", label: "from connect to preview" },
  { value: "3 axes", label: "language, genre, mood" },
  { value: "1 click", label: "to confirm playlist creation" }
];

export function Hero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-hero-bloom" />
      <div className="absolute inset-y-0 right-0 hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_38%),linear-gradient(180deg,rgba(255,78,107,0.18),rgba(255,4,54,0.02))] lg:block lg:left-[calc(50%-7rem)] xl:left-[calc(50%-6.5rem)]" />

      <div className="relative mx-auto flex min-h-[100svh] max-w-[84rem] flex-col justify-center px-5 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28 lg:px-8 lg:pb-10 lg:pt-28 xl:px-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.11fr)_minmax(252px,0.56fr)] lg:items-center lg:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(292px,0.54fr)] xl:gap-12">
          <div className="max-w-[39rem] xl:max-w-[41rem]">
            <p className="mb-5 text-sm uppercase tracking-[0.34em] text-white/60">
              Apple Music library sorter
            </p>
            <h1 className="font-display text-[clamp(2.95rem,5.4vw,5.55rem)] font-semibold leading-[0.95] tracking-[-0.045em] lg:text-[clamp(3.05rem,4.9vw,5.35rem)] xl:text-[clamp(3.7rem,5vw,5.85rem)]">
              Turn a messy library into playlists you will actually use.
            </h1>
            <p className="mt-5 max-w-[35rem] text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
              Connect Apple Music, scan saved tracks, preview curated playlists by language,
              genre, and mood, then write the result back into your account when you are ready.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/dashboard">
                <Button className="min-h-14 min-w-52 px-7 py-4 text-base shadow-[0_28px_90px_rgba(255,4,54,0.22)]">
                  Start a sort
                </Button>
              </Link>
              <a href="#preview">
                <Button
                  variant="secondary"
                  className="min-w-44 border-white/20 bg-white/5 text-white"
                >
                  See the preview
                </Button>
              </a>
            </div>
          </div>

          <div className="grid w-full max-w-[17.75rem] gap-3 text-left lg:justify-self-end lg:pl-8 xl:max-w-[19.2rem] xl:pl-10">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="border-t border-white/12 py-3 first:border-t-0 lg:border-t lg:py-4"
              >
                <div className="font-display text-[1.9rem] tracking-[-0.04em] sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/52 sm:text-sm sm:tracking-[0.22em]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
