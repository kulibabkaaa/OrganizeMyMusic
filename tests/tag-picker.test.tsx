import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TagChip } from "@/components/app/sort-builder/tag-chip";
import { TagNotePanel } from "@/components/app/sort-builder/tag-note-panel";
import { TagPicker } from "@/components/app/sort-builder/tag-picker";

describe("structured tag UI", () => {
  it("renders keyboard-accessible add-tag controls with all categories", () => {
    const markup = renderToStaticMarkup(
      <TagPicker existingTags={[]} onAddTag={() => undefined} defaultOpen />
    );

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
    expect(markup).toContain("Add your own value only when the right tag is not listed.");
  });

  it("keeps advanced saved tags label-compatible without showing them as picker categories", () => {
    const chipMarkup = renderToStaticMarkup(
      <TagChip
        tag={{ id: "tag_artist_style_minimal", category: "artist_style", value: "Minimal" }}
        onEditNote={() => undefined}
        onRemove={() => undefined}
      />
    );
    const pickerMarkup = renderToStaticMarkup(
      <TagPicker existingTags={[]} onAddTag={() => undefined} defaultOpen />
    );

    expect(chipMarkup).toContain("Artist style: Minimal");
    expect(pickerMarkup).not.toContain("Artist style");
  });

  it("marks already-selected suggestions so duplicate tags cannot be added", () => {
    const markup = renderToStaticMarkup(
      <TagPicker
        existingTags={[{ id: "tag_mood_sad", category: "mood", value: "Sad" }]}
        onAddTag={() => undefined}
        defaultOpen
      />
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("Selected");
  });

  it("renders chip note and remove actions with saved-note indicator", () => {
    const markup = renderToStaticMarkup(
      <TagChip
        tag={{ id: "tag_1", category: "mood", value: "Sad", note: "Melancholic." }}
        onEditNote={() => undefined}
        onRemove={() => undefined}
      />
    );

    expect(markup).toContain("Mood: Sad");
    expect(markup).toContain("Tag note saved");
    expect(markup).toContain("Edit review note for Mood: Sad");
    expect(markup).toContain("Remove Mood: Sad");
  });

  it("renders inline Tag Note editing without a modal", () => {
    const markup = renderToStaticMarkup(
      <TagNotePanel
        tag={{ id: "tag_1", category: "mood", value: "Sad", note: "Melancholic." }}
        onSaveNote={() => undefined}
        onRemoveNote={() => undefined}
        onClose={() => undefined}
      />
    );

    expect(markup).toContain("Review context only");
    expect(markup).toContain("Tag notes are saved with the playlist plan for review.");
    expect(markup).toContain("They do not change sorting.");
    expect(markup).toContain("Note for Sad");
    expect(markup).toContain("Example: save for review: slower, melancholic, not angry.");
    expect(markup).toContain("Save review note");
    expect(markup).toContain("Remove note");
    expect(markup).not.toContain("role=\"dialog\"");
  });
});
