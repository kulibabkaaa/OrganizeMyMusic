import React from "react";

const faqs = [
  {
    question: "Does the app touch my Apple Music playlists before I approve?",
    answer:
      "No. The system reads your library, builds proposed playlists, and waits for your manual export confirmation before it creates app-managed playlists."
  },
  {
    question: "What does the first Sort create?",
    answer:
      "A full-library Sort creates persistent playlists with saved recipes, so you can revisit the playlist, regenerate it, and edit the tracks later."
  },
  {
    question: "What happens when I want a new playlist later?",
    answer:
      "Create a playlist directly from the Playlist hub, add simple tags and instructions, generate tracks from your synced library, review the list, then export."
  }
];

export function Faq() {
  return (
    <section id="faq" className="bg-white text-black">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-28">
        <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-black/45">FAQ</p>
            <h2 className="mt-4 font-display text-4xl tracking-[-0.04em]">
              Built for real users, not a throwaway music hack.
            </h2>
          </div>
          <div className="space-y-8">
            {faqs.map((faq) => (
              <article key={faq.question} className="border-t border-black/10 pt-5">
                <h3 className="text-xl font-medium">{faq.question}</h3>
                <p className="mt-3 max-w-2xl leading-7 text-black/64">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
