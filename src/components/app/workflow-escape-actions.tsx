import React from "react";
import Link from "next/link";
import type { Route } from "next";

export function WorkflowEscapeActions({
  sortId,
  showBuilderLink = false,
  className = ""
}: {
  sortId?: string;
  showBuilderLink?: boolean;
  className?: string;
}) {
  return (
    <nav aria-label="Workflow escape actions" className={`flex flex-wrap gap-3 ${className}`.trim()}>
      <EscapeLink href="/app">Back to dashboard</EscapeLink>
      <EscapeLink href="/app/sorts">View all Sorts</EscapeLink>
      {showBuilderLink && sortId ? (
        <EscapeLink href={`/app/sorts/${encodeURIComponent(sortId)}/builder` as Route}>
          Back to builder
        </EscapeLink>
      ) : null}
    </nav>
  );
}

function EscapeLink({ href, children }: { href: Route | URL; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
    >
      {children}
    </Link>
  );
}
