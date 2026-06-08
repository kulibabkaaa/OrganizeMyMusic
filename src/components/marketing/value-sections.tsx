import React from "react";

const sections = [
  {
    eyebrow: "How it works",
    title: "Start with one full-library organization.",
    body:
      "Create playlist plans, tune the recipe behind each playlist, then let the app select tracks from your synced Apple Music library.",
    anchor: "how-it-works"
  },
  {
    eyebrow: "Ongoing value",
    title: "Keep playlists as saved objects, not one-off sessions.",
    body:
      "After the first Sort, create new playlists any time, regenerate from the same recipe, and review every proposed track before export.",
    anchor: "preview"
  },
  {
    eyebrow: "MVP access",
    title: "Billing stays deferred while Apple Music quality is verified.",
    body:
      "The MVP focuses on safe Apple Music sync, editable playlist review, and app-created playlist export before subscription packaging is introduced.",
    anchor: "pricing"
  }
];

export function ValueSections() {
  return (
    <section className="bg-white text-black">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-3">
          {sections.map((section) => (
            <article key={section.title} id={section.anchor} className="border-t border-black/10 pt-6">
              <p className="text-xs uppercase tracking-[0.24em] text-black/45">{section.eyebrow}</p>
              <h2 className="mt-4 max-w-sm font-display text-3xl tracking-[-0.03em] lg:min-h-[11rem]">
                {section.title}
              </h2>
              <p className="mt-4 max-w-sm text-base leading-7 text-black/66">{section.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
