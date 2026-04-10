const sections = [
  {
    eyebrow: "How it works",
    title: "Preview the result before a dollar changes hands.",
    body:
      "The product ingests your Apple Music library, removes duplicate noise, classifies each track, and generates a fixed playlist bundle you can inspect before paying.",
    anchor: "how-it-works"
  },
  {
    eyebrow: "Why it feels useful",
    title: "The sorting logic stays opinionated so the output is clean.",
    body:
      "MVP keeps the dimensions tight: language, genre, and mood. That makes the results easier to trust, support, and improve with real user feedback.",
    anchor: "preview"
  },
  {
    eyebrow: "Payment model",
    title: "A one-time sort fits the job better than a subscription.",
    body:
      "Users pay after the preview, then manually confirm playlist creation in Apple Music. The product stays low-friction while still protecting against accidental writes.",
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
              <h2 className="mt-4 max-w-sm font-display text-3xl tracking-[-0.03em]">
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

