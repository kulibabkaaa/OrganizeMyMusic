import Link from "next/link";

import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-[84rem] items-center justify-between px-5 py-6 sm:px-6 lg:px-8 xl:px-10">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-white">
          Organize Your Music
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
          <a href="#how-it-works">How it works</a>
          <a href="#preview">Preview</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>

        <Link href="/dashboard">
          <Button className="bg-white text-black shadow-none">Open app</Button>
        </Link>
      </div>
    </header>
  );
}
