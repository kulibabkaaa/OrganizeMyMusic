import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const stats: {
  value: string;
  label: string;
  valueClassName?: string;
  labelClassName?: string;
}[] = [
  { value: "3 min", label: "FROM MESS TO ORGANIZED" },
  {
    value: "Endless categories",
    label: "GENRE, MOOD, LANGUAGE, ERA, REGION",
    valueClassName:
      "whitespace-nowrap text-[1.5rem] tracking-[-0.05em] sm:text-[1.68rem] xl:text-[1.82rem]",
    labelClassName:
      "whitespace-nowrap text-[0.6rem] tracking-[0.11em] sm:text-[0.68rem] sm:tracking-[0.13em] xl:text-[0.74rem]"
  },
  { value: "1 click", label: "TO SORT YOUR MUSIC" }
];

export function Hero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-black text-white">
      <div className="absolute inset-0 bg-hero-bloom" />
      <div className="absolute inset-0 hidden bg-[radial-gradient(circle_at_78%_12%,rgba(255,255,255,0.12),transparent_20%),radial-gradient(circle_at_86%_74%,rgba(109,10,27,0.26),transparent_28%),linear-gradient(104deg,rgba(22,2,7,0)_30%,rgba(30,4,10,0.06)_42%,rgba(39,4,10,0.16)_52%,rgba(48,7,15,0.34)_66%,rgba(56,10,19,0.62)_80%,rgba(38,5,12,0.92)_100%)] lg:block" />

      <div className="relative mx-auto flex min-h-[100svh] max-w-[84rem] flex-col justify-center px-5 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28 lg:px-8 lg:pb-10 lg:pt-28 xl:px-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.11fr)_minmax(252px,0.56fr)] lg:items-center lg:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(292px,0.54fr)] xl:gap-12">
          <div className="max-w-[39rem] xl:max-w-[41rem]">
            <p className="mb-5 text-sm uppercase tracking-[0.34em] text-white/60">
              Apple Music library sorter
            </p>
            <h1 className="font-display text-[clamp(2.8rem,4.9vw,4.85rem)] font-semibold leading-[1.04] tracking-[0em] lg:text-[clamp(2.7rem,4.05vw,4.35rem)] xl:text-[clamp(3rem,3.95vw,4.7rem)]">
              Turn a messy
              <br className="hidden lg:block" />
              library <span className="whitespace-nowrap">into playlists</span>
              <br className="hidden lg:block" />
              <span className="inline lg:mt-[0.09em] lg:block">you&apos;ll actually use.</span>
            </h1>
            <p className="mt-5 max-w-[35rem] text-base leading-7 text-white/72 sm:text-lg sm:leading-8">
              Connect Apple Music, scan your library, preview playlists organized by category,
              and save them back to your account when ready.
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

          <div className="grid w-full max-w-[18.9rem] gap-3 text-left lg:-translate-y-12 lg:justify-self-end lg:pl-8 xl:max-w-[20.5rem] xl:-translate-y-16 xl:pl-10">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="border-t border-white/12 py-3 first:border-t-0 lg:border-t lg:py-4"
              >
                <div
                  className={cn(
                    "font-display text-[2.05rem] tracking-[-0.04em] sm:text-[2.8rem]",
                    stat.valueClassName
                  )}
                >
                  {stat.value}
                </div>
                <div
                  className={cn(
                    "mt-1 text-xs uppercase tracking-[0.2em] text-white/52 sm:text-sm sm:tracking-[0.22em]",
                    stat.labelClassName
                  )}
                >
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
