const sections = [
  {
    eyebrow: "How it works",
    title: "Pay once, then let the sort begin.",
    body:
      "We scan your Apple Music library, analyze your tracks, and build a playlist set for you to inspect before anything is added to your account.",
    anchor: "how-it-works"
  },
  {
    eyebrow: "Why it feels useful",
    title: "Common categories when you want speed. Custom criteria when you want control.",
    body:
      "Use familiar playlist criteria like genre, mood, language, era, and energy, or describe a more specific idea in your own words. The result can be broad, narrow, or highly specific.",
    anchor: "preview"
  },
  {
    eyebrow: "Payment model",
    title: "Pay once. Sort your library. Keep the result.",
    body:
      "Pay once, and we will scan and organize your library. Once your playlists are ready, you can review them before saving them to Apple Music.",
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
