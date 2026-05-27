import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SortBuilderTagChip } from "@/components/app/sort-builder/tag-chip";
import { TagNotePanel } from "@/components/app/sort-builder/tag-note-panel";
import { TagPicker } from "@/components/app/sort-builder/tag-picker";

const moodTag = {
  id: "tag_mood_sad",
  category: "mood" as const,
  value: "Sad",
  note: "Slower, melancholic, not angry."
};

describe("Sort builder tags", () => {
  it("renders the add tag flow with structured categories and values", () => {
    const markup = renderToStaticMarkup(<TagPicker defaultOpen onAddTag={vi.fn()} />);

    expect(markup).toContain("Add tag");
    expect(markup).toContain("Tag category");
    expect(markup).toContain("Tag categories");
    expect(markup).toContain("Mood");
    expect(markup).toContain("Genre");
    expect(markup).toContain("Language");
    expect(markup).toContain("Energy");
    expect(markup).toContain("Activity");
    expect(markup).not.toContain("Era");
    expect(markup).not.toContain("Region");
    expect(markup).not.toContain("Artist style");
    expect(markup).not.toContain(">Custom<");
    expect(markup).toContain("Mood suggestions");
    expect(markup).toContain("Sad");
    expect(markup).toContain("Own value");
    expect(markup).toContain("Save tag");
  });

  it("shows selected suggestions as unavailable duplicates", () => {
    const markup = renderToStaticMarkup(
      <TagPicker existingTags={[moodTag]} defaultOpen onAddTag={vi.fn()} />
    );

    expect(markup).toContain("Selected");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('disabled=""');
  });

  it("renders note-aware chips with keyboard-addressable actions", () => {
    const markup = renderToStaticMarkup(
      <SortBuilderTagChip tag={moodTag} onEditNote={vi.fn()} onRemove={vi.fn()} />
    );

    expect(markup).toContain("Mood: Sad");
    expect(markup).toContain("Tag note saved");
    expect(markup).toContain("Edit review note for Mood: Sad");
    expect(markup).toContain("Remove Mood: Sad");
  });

  it("renders inline Tag Note editing without a modal dialog", () => {
    const markup = renderToStaticMarkup(
      <TagNotePanel tag={moodTag} onSaveNote={vi.fn()} onRemoveNote={vi.fn()} />
    );

    expect(markup).toContain("Review context only");
    expect(markup).toContain("Tag notes are saved with the playlist plan for review.");
    expect(markup).toContain("They do not change sorting.");
    expect(markup).toContain("Note for Sad");
    expect(markup).toContain("Example: save for review: slower, melancholic, not angry.");
    expect(markup).toContain("Save review note");
    expect(markup).toContain("Remove note");
    expect(markup).not.toContain('role="dialog"');
  });
});
