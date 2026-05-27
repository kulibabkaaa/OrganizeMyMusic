"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PlaylistRecipeEditor } from "@/components/app/sort-builder/playlist-recipe-editor";
import { PlaylistRecipeList } from "@/components/app/sort-builder/playlist-recipe-list";
import {
  AutosaveStatusBadge,
  SortBuilderFooter,
  type AutosaveStatus
} from "@/components/app/sort-builder/sort-builder-footer";
import {
  createDefaultBuilderRecipe,
  duplicateBuilderRecipe,
  moveBuilderRecipe,
  playlistRecipeToBuilderRecipe,
  validateSortBuilder,
  type BuilderRecipe
} from "@/components/app/sort-builder/sort-builder-validation";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { PreviewReadiness, SortDraft } from "@/modules/sorts/drafts";
import type { PlaylistRecipe } from "@/types/domain";

type SaveDraftResult = { ok: true; sortId: string } | { ok: false };
type SaveState = "idle" | "saving" | "saved" | "failed";

export function SortBuilder({
  mode,
  initialSort,
  initialRecipes,
  preview
}: {
  mode: "new" | "edit";
  initialSort: SortDraft | null;
  initialRecipes: PlaylistRecipe[];
  preview: PreviewReadiness;
}) {
  const router = useRouter();
  const initialBuilderRecipes =
    initialRecipes.length > 0
      ? initialRecipes.map(playlistRecipeToBuilderRecipe)
      : [createDefaultBuilderRecipe(0)];
  const [sortId, setSortId] = useState(initialSort?.id ?? null);
  const [sortName, setSortName] = useState(initialSort?.name ?? "My Apple Music cleanup");
  const [recipes, setRecipes] = useState<BuilderRecipe[]>(initialBuilderRecipes);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(recipes[0]?.id ?? null);
  const [deletedRecipeIds, setDeletedRecipeIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<SaveState>(initialSort?.updatedAt ? "saved" : "idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialSort?.updatedAt ?? null);
  const [savedThisSession, setSavedThisSession] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveCounterRef = useRef(0);
  const isSavingRef = useRef(false);
  const failedSignatureRef = useRef<string | null>(null);
  const lastSavedSignatureRef = useRef<string | null>(
    initialSort && initialRecipes.length > 0
      ? createDraftSignature({
          sortName: initialSort.name,
          recipes: initialBuilderRecipes,
          deletedRecipeIds: []
        })
      : null
  );

  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId) ?? recipes[0] ?? null;
  const validation = validateSortBuilder({
    sortName,
    recipes,
    previewCanRun: preview.canPreview
  });
  const previewHref = sortId ? `/app/sorts/${encodeURIComponent(sortId)}/preview` : null;
  const previewMessage = validation.message ?? preview.disabledReason;
  const autosaveStatus = getAutosaveStatus({
    state: isSaving ? "saving" : saveState,
    error: saveError,
    lastSavedAt,
    savedThisSession
  });

  useEffect(() => {
    if (!validation.canSave) {
      return;
    }

    const signature = createDraftSignature({
      sortName,
      recipes,
      deletedRecipeIds
    });

    if (signature === lastSavedSignatureRef.current) {
      return;
    }

    if (signature === failedSignatureRef.current) {
      return;
    }

    if (isSaving) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void saveDraft();
    }, 1200);

    return () => clearTimeout(timeoutId);
  // Autosave is intentionally driven by field changes, not by saveDraft identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletedRecipeIds, isSaving, recipes, sortName, validation.canSave]);

  function updateRecipe(updatedRecipe: BuilderRecipe) {
    setRecipes((currentRecipes) =>
      currentRecipes.map((recipe) =>
        recipe.id === updatedRecipe.id ? { ...updatedRecipe } : recipe
      )
    );
  }

  function addRecipe() {
    const recipe = createDefaultBuilderRecipe(recipes.length);
    setRecipes((currentRecipes) => [...currentRecipes, recipe]);
    setSelectedRecipeId(recipe.id);
  }

  function duplicateRecipe(recipeId: string) {
    const recipe = recipes.find((item) => item.id === recipeId);

    if (!recipe) {
      return;
    }

    const duplicate = duplicateBuilderRecipe(recipe, recipes.length);
    setRecipes((currentRecipes) => [...currentRecipes, duplicate]);
    setSelectedRecipeId(duplicate.id);
  }

  function deleteRecipe(recipeId: string) {
    const recipe = recipes.find((item) => item.id === recipeId);

    if (!recipe || recipes.length === 1) {
      return;
    }

    setRecipes((currentRecipes) =>
      currentRecipes
        .filter((item) => item.id !== recipeId)
        .map((item, position) => ({ ...item, position }))
    );
    if (recipe.persistedId) {
      setDeletedRecipeIds((currentIds) => [...currentIds, recipe.persistedId as string]);
    }
    setSelectedRecipeId(recipes.find((item) => item.id !== recipeId)?.id ?? null);
  }

  function moveRecipe(recipeId: string, direction: "up" | "down") {
    setRecipes((currentRecipes) => moveBuilderRecipe(currentRecipes, recipeId, direction));
  }

  async function saveDraft(): Promise<SaveDraftResult> {
    if (!validation.canSave) {
      return { ok: false };
    }

    if (isSavingRef.current) {
      return { ok: false };
    }

    const saveId = saveCounterRef.current + 1;
    saveCounterRef.current = saveId;
    isSavingRef.current = true;
    setIsSaving(true);
    setSaveState("saving");
    setSaveError(null);
    setSavedThisSession(false);

    const draftSnapshot = {
      sortId,
      sortName,
      recipes: recipes.map(cloneBuilderRecipe),
      deletedRecipeIds: [...deletedRecipeIds],
      signature: createDraftSignature({
        sortName,
        recipes,
        deletedRecipeIds
      })
    };

    try {
      failedSignatureRef.current = null;
      const savedSortId = draftSnapshot.sortId ?? (await createSort(draftSnapshot.sortName));

      if (!savedSortId) {
        setSaveState("failed");
        setSaveError("Unable to create Sort draft.");
        failedSignatureRef.current = draftSnapshot.signature;
        return { ok: false };
      }

      if (draftSnapshot.sortId) {
        await requestDraftSave(`/api/app/sorts/${encodeURIComponent(savedSortId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: draftSnapshot.sortName })
        });
      }

      await Promise.all(
        draftSnapshot.deletedRecipeIds.map((recipeId) =>
          requestDraftSave(`/api/app/sorts/${encodeURIComponent(savedSortId)}/recipes/${encodeURIComponent(recipeId)}`, {
            method: "DELETE"
          })
        )
      );

      const persistedIdByLocalId = new Map<string, string>();

      for (const recipe of draftSnapshot.recipes) {
        const payload = recipeToApiPayload(savedSortId, recipe);
        if (recipe.persistedId) {
          await requestDraftSave(
            `/api/app/sorts/${encodeURIComponent(savedSortId)}/recipes/${encodeURIComponent(recipe.persistedId)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            }
          );
        } else {
          const response = await requestDraftSave(`/api/app/sorts/${encodeURIComponent(savedSortId)}/recipes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const body = (await response.json().catch(() => null)) as { recipe?: PlaylistRecipe } | null;
          if (body?.recipe) {
            persistedIdByLocalId.set(recipe.id, body.recipe.id);
          }
        }
      }

      const positions = draftSnapshot.recipes
        .map((recipe, position) => {
          const id = recipe.persistedId ?? persistedIdByLocalId.get(recipe.id);
          return id ? { id, position } : null;
        })
        .filter((position): position is { id: string; position: number } => Boolean(position));

      if (positions.length === draftSnapshot.recipes.length) {
        await requestDraftSave(`/api/app/sorts/${encodeURIComponent(savedSortId)}/recipes`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positions })
        });
      }

      setSortId(savedSortId);
      if (persistedIdByLocalId.size > 0) {
        setRecipes((currentRecipes) =>
          currentRecipes.map((recipe) => {
            const persistedId = persistedIdByLocalId.get(recipe.id);
            return persistedId ? { ...recipe, persistedId } : recipe;
          })
        );
      }
      setDeletedRecipeIds((currentIds) =>
        currentIds.filter((recipeId) => !draftSnapshot.deletedRecipeIds.includes(recipeId))
      );
      lastSavedSignatureRef.current = createDraftSignature({
        sortName: draftSnapshot.sortName,
        recipes: draftSnapshot.recipes.map((recipe) => {
          const persistedId = persistedIdByLocalId.get(recipe.id);
          return persistedId ? { ...recipe, persistedId } : recipe;
        }),
        deletedRecipeIds: []
      });
      setLastSavedAt(new Date().toISOString());
      setSaveState("saved");
      setSaveError(null);
      setSavedThisSession(true);
      if (mode === "new" && !draftSnapshot.sortId) {
        router.push(`/app/sorts/${encodeURIComponent(savedSortId)}/builder`);
      }
      return { ok: true, sortId: savedSortId };
    } catch (error) {
      setSaveState("failed");
      setSaveError(error instanceof Error ? error.message : "Unable to autosave draft.");
      failedSignatureRef.current = draftSnapshot.signature;
      return { ok: false };
    } finally {
      if (saveCounterRef.current === saveId) {
        setIsSaving(false);
      }
      isSavingRef.current = false;
    }
  }

  async function createSort(name: string) {
    const response = await requestDraftSave("/api/app/sorts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sourceProvider: "apple_music"
      })
    });
    const body = (await response.json().catch(() => null)) as { sort?: SortDraft } | null;
    return body?.sort?.id ?? null;
  }

  function retrySave() {
    void saveDraft();
  }

  async function previewSort() {
    if (!validation.canPreview || !sortId) {
      return;
    }

    const saved = await saveDraft();

    if (!saved.ok) {
      return;
    }

    router.push(`/app/sorts/${encodeURIComponent(saved.sortId)}/preview`);
  }

  const headerLabel = mode === "new" ? "New Sort" : "Sort draft";

  return (
    <div className="space-y-6 pb-4">
      <SortBuilderTopBar autosaveStatus={autosaveStatus} />

      <section className="grid min-w-0 gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            {headerLabel}
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[0em] text-white md:text-4xl">
            Build playlist plans
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-platform-secondary">
            Create one Sort with multiple playlist plans. Each plan becomes a playlist after sorting.
          </p>
        </div>
        <StatusPill label="Apple Music source" tone="success" />
      </section>

      <Card className="grid min-w-0 gap-4 md:grid-cols-2">
        <label className="block min-w-0 text-sm font-semibold text-white">
          Sort name
          <input
            value={sortName}
            onChange={(event) => setSortName(event.target.value)}
            className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition focus:border-platform-pink"
          />
        </label>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <label className="block min-w-0 text-sm font-semibold text-white">
            Source library
            <input
              value="Apple Music"
              readOnly
              className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-platform-secondary outline-none"
            />
          </label>
          <label className="block min-w-0 text-sm font-semibold text-white">
            Output behavior
            <select
              value="create_new"
              disabled
              className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-[#171113] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="create_new">Create new playlists only</option>
              <option value="do_not_modify">Do not modify existing playlists</option>
              <option value="avoid_duplicates">Avoid duplicates where possible</option>
            </select>
          </label>
        </div>
      </Card>

      <section className="grid min-w-0 gap-5 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)]">
        <PlaylistRecipeList
          recipes={recipes}
          selectedRecipeId={selectedRecipe?.id ?? null}
          onAdd={addRecipe}
          onSelect={setSelectedRecipeId}
          onDuplicate={duplicateRecipe}
          onDelete={deleteRecipe}
          onMove={moveRecipe}
        />
        <PlaylistRecipeEditor recipe={selectedRecipe} onChange={updateRecipe} />
      </section>

      <SortBuilderFooter
        plannedCount={recipes.length}
        canPreview={validation.canPreview}
        previewHref={previewHref}
        message={previewMessage}
        isSaving={isSaving}
        autosaveStatus={autosaveStatus}
        onPreview={previewSort}
        onRetrySave={retrySave}
      />
    </div>
  );
}

function createDraftSignature(input: {
  sortName: string;
  recipes: BuilderRecipe[];
  deletedRecipeIds: string[];
}) {
  return JSON.stringify({
    sortName: input.sortName,
    recipes: input.recipes.map((recipe) => ({
      persistedId: recipe.persistedId ?? null,
      position: recipe.position,
      name: recipe.name,
      playlistNote: recipe.playlistNote,
      targetTrackMin: recipe.targetTrackMin,
      targetTrackMax: recipe.targetTrackMax,
      duplicatePolicy: recipe.duplicatePolicy,
      allowExplicit: recipe.allowExplicit,
      includeLibraryOnly: recipe.includeLibraryOnly,
      tags: recipe.tags
    })),
    deletedRecipeIds: input.deletedRecipeIds
  });
}

function cloneBuilderRecipe(recipe: BuilderRecipe): BuilderRecipe {
  return {
    ...recipe,
    tags: recipe.tags.map((tag) => ({ ...tag }))
  };
}

export function SortBuilderTopBar({ autosaveStatus }: { autosaveStatus: AutosaveStatus }) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Builder navigation" className="flex flex-wrap gap-3">
          <Link
            href="/app/sorts"
            className="inline-flex min-h-10 items-center rounded-full border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
          >
            Back to Sorts
          </Link>
          <Link
            href="/app/sorts?status=draft"
            className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-platform-secondary transition hover:-translate-y-0.5 hover:bg-white/[0.09] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
          >
            Drafts
          </Link>
        </nav>
        <div className="min-w-0 lg:flex lg:justify-end">
          <AutosaveStatusBadge status={autosaveStatus} id="sort-builder-top-autosave-status" />
        </div>
      </div>
    </section>
  );
}

function recipeToApiPayload(sortRunId: string, recipe: BuilderRecipe) {
  return {
    sortRunId,
    position: recipe.position,
    name: recipe.name,
    playlistNote: recipe.playlistNote,
    targetTrackMin: recipe.targetTrackMin,
    targetTrackMax: recipe.targetTrackMax,
    duplicatePolicy: recipe.duplicatePolicy,
    allowExplicit: recipe.allowExplicit,
    includeLibraryOnly: recipe.includeLibraryOnly,
    tags: recipe.tags
  };
}

function getAutosaveStatus({
  state,
  error,
  lastSavedAt,
  savedThisSession
}: {
  state: SaveState;
  error: string | null;
  lastSavedAt: string | null;
  savedThisSession: boolean;
}): AutosaveStatus {
  if (state === "saving") {
    return {
      state,
      message: "Saving...",
      detail: null,
      canRetry: false
    };
  }

  if (state === "failed") {
    return {
      state,
      message: "Save failed",
      detail: error,
      canRetry: true
    };
  }

  if (state === "saved") {
    return {
      state,
      message: savedThisSession ? "Saved just now" : "Draft autosaves.",
      detail: lastSavedAt ? `Last saved ${formatSavedAt(lastSavedAt)}` : null,
      canRetry: false
    };
  }

  return {
    state,
    message: "Draft autosaves.",
    detail: lastSavedAt ? `Last saved ${formatSavedAt(lastSavedAt)}` : null,
    canRetry: false
  };
}

function formatSavedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short"
  }).format(new Date(value));
}

async function requestDraftSave(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Unable to autosave draft.");
  }

  return response;
}
