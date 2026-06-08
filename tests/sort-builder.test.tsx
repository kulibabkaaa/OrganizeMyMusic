import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  SortBuilder,
  SortBuilderTopBar
} from "@/components/app/sort-builder/sort-builder";
import {
  formatTargetSize,
  getTargetSizePresetId
} from "@/components/app/sort-builder/playlist-recipe-editor";
import { SortBuilderFooter } from "@/components/app/sort-builder/sort-builder-footer";
import {
  createDefaultBuilderRecipe,
  duplicateBuilderRecipe,
  getBuilderRecipeReadiness,
  moveBuilderRecipe,
  playlistRecipeToBuilderRecipe,
  validateSortBuilder
} from "@/components/app/sort-builder/sort-builder-validation";
import type { SortDraft } from "@/modules/sorts/drafts";
import type { PlaylistRecipe } from "@/types/domain";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}));

const draft: SortDraft = {
  id: "33333333-3333-4333-8333-333333333333",
  userId: "user_1",
  librarySyncId: "11111111-1111-4111-8111-111111111111",
  name: "My Apple Music cleanup",
  sourceProvider: "apple_music",
  state: "draft",
  paymentStatus: "pending",
  createdAt: "2026-05-26T10:00:00.000Z",
  updatedAt: "2026-05-26T10:00:00.000Z"
};

const recipes: PlaylistRecipe[] = [
  {
    id: "44444444-4444-4444-8444-444444444444",
    userId: "user_1",
    sortRunId: draft.id,
    position: 0,
    name: "Sad late-night songs",
    playlistNote: "Melancholic, slow, intimate songs.",
    targetTrackMin: 30,
    targetTrackMax: 50,
    duplicatePolicy: "avoid_duplicates",
    allowExplicit: true,
    includeLibraryOnly: true,
    tags: [
      { id: "tag_mood_sad", category: "mood", value: "Sad" },
      { id: "tag_energy_low", category: "energy", value: "Low" }
    ],
    createdAt: "2026-05-26T10:00:00.000Z",
    updatedAt: "2026-05-26T10:00:00.000Z"
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    userId: "user_1",
    sortRunId: draft.id,
    position: 1,
    name: "Spanish pop reset",
    playlistNote: null,
    targetTrackMin: null,
    targetTrackMax: null,
    duplicatePolicy: "avoid_duplicates",
    allowExplicit: false,
    includeLibraryOnly: true,
    tags: [{ id: "tag_language_spanish", category: "language", value: "Spanish" }],
    createdAt: "2026-05-26T10:00:00.000Z",
    updatedAt: "2026-05-26T10:00:00.000Z"
  }
];

describe("Sort builder validation", () => {
  it("requires a named Sort and usable playlist recipes before generation", () => {
    expect(
      validateSortBuilder({
        sortName: "My Apple Music cleanup",
        recipes: recipes.map(playlistRecipeToBuilderRecipe),
        previewCanRun: true
      })
    ).toEqual({
      canSave: true,
      canPreview: true,
      message: null
    });

    expect(
      validateSortBuilder({
        sortName: " ",
        recipes: [],
        previewCanRun: false
      })
    ).toEqual({
      canSave: false,
      canPreview: false,
      message: "Name this Sort and add at least one playlist recipe."
    });

    expect(
      validateSortBuilder({
        sortName: "Draft",
        recipes: [
          {
            id: "local_1",
            position: 0,
            name: "No tags",
            playlistNote: null,
            targetTrackMin: 25,
            targetTrackMax: 50,
            duplicatePolicy: "avoid_duplicates",
            allowExplicit: true,
            includeLibraryOnly: true,
            tags: []
          }
        ],
        previewCanRun: true
      })
    ).toMatchObject({
      canSave: true,
      canPreview: false,
      message: 'Add at least one supported tag to "No tags" before preview.'
    });

    expect(
      validateSortBuilder({
        sortName: "Draft",
        recipes: [
          {
            id: "local_unsupported",
            position: 0,
            name: "Old advanced plan",
            playlistNote: null,
            targetTrackMin: 25,
            targetTrackMax: 50,
            duplicatePolicy: "avoid_duplicates",
            allowExplicit: true,
            includeLibraryOnly: true,
            tags: [{ id: "tag_era_2000s", category: "era", value: "2000s" }]
          }
        ],
        previewCanRun: true
      })
    ).toEqual({
      canSave: true,
      canPreview: false,
      message: 'Add at least one supported tag to "Old advanced plan" before preview.'
    });

    expect(
      validateSortBuilder({
        sortName: "Draft",
        recipes: [
          {
            id: "local_2",
            position: 0,
            name: "Too many tracks",
            playlistNote: null,
            targetTrackMin: 50,
            targetTrackMax: 501,
            duplicatePolicy: "avoid_duplicates",
            allowExplicit: true,
            includeLibraryOnly: true,
            tags: [{ id: "tag_mood_focus", category: "mood", value: "Focus" }]
          }
        ],
        previewCanRun: true
      })
    ).toEqual({
      canSave: false,
      canPreview: false,
      message:
        'Fix target size for "Too many tracks": Keep every playlist recipe target size at 500 tracks or fewer.'
    });

    expect(
      validateSortBuilder({
        sortName: "Draft",
        recipes: [
          {
            id: "local_3",
            position: 0,
            name: "Inverted range",
            playlistNote: null,
            targetTrackMin: 80,
            targetTrackMax: 40,
            duplicatePolicy: "avoid_duplicates",
            allowExplicit: true,
            includeLibraryOnly: true,
            tags: [{ id: "tag_mood_focus", category: "mood", value: "Focus" }]
          }
        ],
        previewCanRun: true
      })
    ).toEqual({
      canSave: false,
      canPreview: false,
      message:
        'Fix target size for "Inverted range": Keep each playlist recipe target minimum less than or equal to its maximum.'
    });
  });

  it("summarizes per-plan readiness checks", () => {
    expect(
      getBuilderRecipeReadiness(
        {
          id: "local_ready",
          position: 0,
          name: "Ready plan",
          playlistNote: null,
          targetTrackMin: 25,
          targetTrackMax: 50,
          duplicatePolicy: "avoid_duplicates",
          allowExplicit: true,
          includeLibraryOnly: true,
          tags: [{ id: "tag_mood_chill", category: "mood", value: "Chill" }]
        },
        0
      )
    ).toMatchObject({
      isReady: true,
      summary: "Ready for preview",
      previewBlocker: null,
      checks: [
        { id: "name", isComplete: true },
        { id: "supported_tags", isComplete: true },
        { id: "target_size", isComplete: true }
      ]
    });

    expect(
      getBuilderRecipeReadiness(
        {
          id: "local_attention",
          position: 1,
          name: "Legacy only",
          playlistNote: null,
          targetTrackMin: 25,
          targetTrackMax: 50,
          duplicatePolicy: "avoid_duplicates",
          allowExplicit: true,
          includeLibraryOnly: true,
          tags: [{ id: "tag_custom_context", category: "custom", value: "Rainy" }]
        },
        1
      )
    ).toMatchObject({
      isReady: false,
      summary: "Add supported tag",
      previewBlocker: 'Add at least one supported tag to "Legacy only" before preview.'
    });
  });

  it("maps target size presets without free-form parsing", () => {
    expect(getTargetSizePresetId({ targetTrackMin: 25, targetTrackMax: 50 })).toBe("25-50");
    expect(getTargetSizePresetId({ targetTrackMin: 30, targetTrackMax: 50 })).toBe("custom");
    expect(formatTargetSize({ targetTrackMin: 15, targetTrackMax: 25 })).toBe("15-25 tracks");
  });

  it("supports default, duplicate, and reorder recipe helpers", () => {
    const first = createDefaultBuilderRecipe(0);
    const duplicate = duplicateBuilderRecipe(first, 1);
    const moved = moveBuilderRecipe([first, duplicate], duplicate.id, "up");

    expect(first).toMatchObject({
      position: 0,
      name: "New playlist",
      duplicatePolicy: "avoid_duplicates",
      allowExplicit: true,
      includeLibraryOnly: true
    });
    expect(duplicate).toMatchObject({
      position: 1,
      name: "New playlist copy"
    });
    expect(moved.map((recipe) => recipe.position)).toEqual([0, 1]);
    expect(moved[0].id).toBe(duplicate.id);
  });
});

describe("SortBuilder", () => {
  it("renders the new Sort builder workspace with autosave controls", () => {
    const markup = renderToStaticMarkup(
      <SortBuilder
        mode="new"
        initialSort={null}
        initialRecipes={[]}
        preview={{ canPreview: false, disabledReason: "Library sync must finish before generating this Sort." }}
      />
    );

    expect(markup).toContain("New Sort");
    expect(markup).toContain("Builder navigation");
    expect(markup).toContain("Back to Sorts");
    expect(markup).toContain('href="/app/sorts"');
    expect(markup).toContain("Drafts");
    expect(markup).toContain('href="/app/sorts?status=draft"');
    expect(markup).toContain('id="sort-builder-top-autosave-status"');
    expect(markup).toContain("Organize your library");
    expect(markup).toContain("Create playlists on the left");
    expect(markup).toContain("Sort name");
    expect(markup).toContain("Source library");
    expect(markup).toContain("Apple Music");
    expect(markup).toContain("Output behavior");
    expect(markup).toContain("Playlists");
    expect(markup).toContain("Each playlist has its own saved recipe.");
    expect(markup).toContain("Add playlist");
    expect(markup).toContain("Ready");
    expect(markup).toContain("Named");
    expect(markup).toContain("Supported tag added");
    expect(markup).toContain("Target size valid");
    expect(markup).toContain("Playlist name");
    expect(markup).toContain("Recipe instructions");
    expect(markup).toContain("Advanced settings");
    expect(markup).toContain("Target size");
    expect(markup).toContain("15-25");
    expect(markup).toContain("25-50");
    expect(markup).toContain("50-100");
    expect(markup).toContain("Custom");
    expect(markup).toContain("Stored as numeric minimum and maximum track counts.");
    expect(markup).toContain("Duplicate handling");
    expect(markup).toContain("Allow explicit tracks");
    expect(markup).toContain("Include library songs only");
    expect(markup).toContain("Keep at least one playlist in this Sort.");
    expect(markup).not.toContain("Move up");
    expect(markup).not.toContain("Move down");
    expect(markup).not.toContain("Save draft");
    expect(markup).toContain("Generate Playlists");
    expect(markup).toContain("You can save this draft now. Preview unlocks when the library index is ready.");
  });

  it("renders saved recipes and enabled preview state for reopened drafts", () => {
    const markup = renderToStaticMarkup(
      <SortBuilder
        mode="edit"
        initialSort={draft}
        initialRecipes={recipes}
        preview={{ canPreview: true, disabledReason: null }}
      />
    );

    expect(markup).toContain("My Apple Music cleanup");
    expect(markup).toContain("Sad late-night songs");
    expect(markup).toContain("Spanish pop reset");
    expect(markup).toContain("Target size minimum");
    expect(markup).toContain("Target size maximum");
    expect(markup).toContain('value="30"');
    expect(markup).toContain('value="50"');
    expect(markup).toContain("Mood: Sad");
    expect(markup).toContain("Energy: Low");
    expect(markup).toContain("Selected");
    expect(markup).toContain("Ready");
    expect(markup).not.toContain("Needs attention");
    expect(markup).toContain("Duplicate playlist");
    expect(markup).toContain("Delete playlist");
    expect(markup).toContain("Move up");
    expect(markup).toContain("Move down");
    expect(markup).not.toContain("Confirm delete");
    expect(markup).not.toContain("Confirm to remove this playlist from the Sort.");
    expect(markup).not.toContain("Keep at least one playlist in this Sort.");
    expect(markup).toContain("2 playlists planned");
    expect(markup).toContain("Generate Playlists");
    expect(markup).toContain("Draft autosaves.");
    expect(markup).toContain("Last saved May 26, 2026, 10:00 AM UTC");
  });

  it("connects disabled preview controls to the visible reason", () => {
    const markup = renderToStaticMarkup(
      <SortBuilder
        mode="new"
        initialSort={null}
        initialRecipes={[]}
        preview={{ canPreview: false, disabledReason: "Library sync must finish before generating this Sort." }}
      />
    );

    expect(markup).toContain('id="sort-builder-footer-message"');
    expect(markup).toContain('aria-describedby="sort-builder-footer-message"');
    expect(markup).toContain("Preview unlocks when the library index is ready.");
  });

  it("shows a visible reason while preview is disabled by saving", () => {
    const markup = renderToStaticMarkup(
      <SortBuilderFooter
        plannedCount={2}
        canPreview
        previewHref="/app/sorts/sort_1/preview"
        message={null}
        isSaving
        autosaveStatus={{
          state: "saving",
          message: "Saving...",
          detail: null,
          canRetry: false
        }}
        onPreview={() => undefined}
        onRetrySave={() => undefined}
      />
    );

    expect(markup).toContain("Saving...");
    expect(markup).toContain("Saving changes before preview.");
    expect(markup).toContain('id="sort-builder-saving-message"');
    expect(markup).toContain('aria-describedby="sort-builder-saving-message sort-builder-autosave-status"');
  });

  it("renders autosave success and failure states with retry", () => {
    const savedMarkup = renderToStaticMarkup(
      <SortBuilderFooter
        plannedCount={2}
        canPreview
        previewHref="/app/sorts/sort_1/preview"
        message={null}
        isSaving={false}
        autosaveStatus={{
          state: "saved",
          message: "Saved just now",
          detail: "Last saved May 27, 2026, 12:30 AM UTC",
          canRetry: false
        }}
        onPreview={() => undefined}
        onRetrySave={() => undefined}
      />
    );

    expect(savedMarkup).toContain("Saved just now");
    expect(savedMarkup).toContain("Last saved May 27, 2026, 12:30 AM UTC");
    expect(savedMarkup).not.toContain("Retry save");

    const failedMarkup = renderToStaticMarkup(
      <SortBuilderFooter
        plannedCount={2}
        canPreview
        previewHref="/app/sorts/sort_1/preview"
        message={null}
        isSaving={false}
        autosaveStatus={{
          state: "failed",
          message: "Save failed",
          detail: "Unable to autosave draft.",
          canRetry: true
        }}
        onPreview={() => undefined}
        onRetrySave={() => undefined}
      />
    );

    expect(failedMarkup).toContain("Save failed");
    expect(failedMarkup).toContain("Unable to autosave draft.");
    expect(failedMarkup).toContain("Retry save");
    expect(failedMarkup).toContain('aria-describedby="sort-builder-autosave-status"');
  });

  it("renders a persistent top bar with Sorts navigation, Drafts, and autosave status", () => {
    const markup = renderToStaticMarkup(
      <SortBuilderTopBar
        autosaveStatus={{
          state: "saved",
          message: "Saved just now",
          detail: "Last saved May 27, 2026, 12:30 AM UTC",
          canRetry: false
        }}
      />
    );

    expect(markup).toContain("Builder navigation");
    expect(markup).toContain("Back to Sorts");
    expect(markup).toContain('href="/app/sorts"');
    expect(markup).toContain("Drafts");
    expect(markup).toContain('href="/app/sorts?status=draft"');
    expect(markup).toContain('id="sort-builder-top-autosave-status"');
    expect(markup).toContain("Saved just now");
  });
});
