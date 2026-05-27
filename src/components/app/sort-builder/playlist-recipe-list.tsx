"use client";

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getBuilderRecipeReadiness,
  type BuilderRecipe
} from "@/components/app/sort-builder/sort-builder-validation";

export function PlaylistRecipeList({
  recipes,
  selectedRecipeId,
  onAdd,
  onSelect,
  onDuplicate,
  onDelete,
  onMove
}: {
  recipes: BuilderRecipe[];
  selectedRecipeId: string | null;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const [pendingDeleteRecipeId, setPendingDeleteRecipeId] = useState<string | null>(null);

  return (
    <Card className="min-w-0 space-y-4 p-4">
      <div className="flex flex-col items-start gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold tracking-[0em] text-white">
            Playlist plans
          </h2>
          <p className="mt-1 text-sm leading-6 text-platform-secondary">
            One Sort can contain multiple playlist plans.
          </p>
        </div>
        <Button variant="glass" className="px-4 py-2.5" onClick={onAdd}>
          Add plan
        </Button>
      </div>

      <div className="grid gap-2">
        {recipes.map((recipe, index) => (
          <RecipeListItem
            key={recipe.id}
            recipe={recipe}
            index={index}
            recipeCount={recipes.length}
            isSelected={selectedRecipeId === recipe.id}
            onSelect={onSelect}
            onDuplicate={onDuplicate}
            onDelete={(id) => {
              onDelete(id);
              setPendingDeleteRecipeId(null);
            }}
            pendingDeleteRecipeId={pendingDeleteRecipeId}
            onStartDelete={setPendingDeleteRecipeId}
            onCancelDelete={() => setPendingDeleteRecipeId(null)}
            onMove={onMove}
          />
        ))}
      </div>
    </Card>
  );
}

function RecipeListItem({
  recipe,
  index,
  recipeCount,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
  pendingDeleteRecipeId,
  onStartDelete,
  onCancelDelete,
  onMove
}: {
  recipe: BuilderRecipe;
  index: number;
  recipeCount: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  pendingDeleteRecipeId: string | null;
  onStartDelete: (id: string) => void;
  onCancelDelete: () => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const canMoveUp = index > 0;
  const canMoveDown = index < recipeCount - 1;
  const canDelete = recipeCount > 1;
  const isConfirmingDelete = pendingDeleteRecipeId === recipe.id;
  const readiness = getBuilderRecipeReadiness(recipe, index);

  return (
    <article
      className={cn(
        "rounded-[1rem] border p-3 transition",
        isSelected
          ? "border-[rgba(255,45,85,0.55)] bg-[rgba(255,45,85,0.14)] shadow-[inset_3px_0_0_rgba(255,45,85,0.95)]"
          : "border-white/10 bg-white/[0.04]"
      )}
    >
      <button
        type="button"
        aria-pressed={isSelected}
        className="block w-full rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink"
        onClick={() => onSelect(recipe.id)}
      >
        <span className="block min-w-0">
          <strong className="block min-w-0 text-sm font-semibold leading-6 text-white">
            {recipe.name}
          </strong>
          <span className="mt-2 flex flex-wrap gap-2">
            {isSelected ? (
              <span className="inline-flex rounded-full border border-[rgba(255,45,85,0.35)] bg-[rgba(255,45,85,0.14)] px-2 py-0.5 text-xs font-semibold text-platform-pink">
                Selected
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                readiness.isReady
                  ? "border-[rgba(57,217,138,0.28)] bg-[rgba(57,217,138,0.10)] text-platform-success"
                  : "border-[rgba(255,205,86,0.30)] bg-[rgba(255,205,86,0.10)] text-[#ffd36a]"
              )}
            >
              {readiness.isReady ? "Ready" : "Needs attention"}
            </span>
          </span>
        </span>
        <span className="mt-1 block text-sm leading-6 text-platform-secondary">
          {recipe.tags.length > 0
            ? recipe.tags.map((tag) => `${formatCategory(tag.category)}: ${tag.value}`).join(", ")
            : "Add supported tags before previewing"}
        </span>
        <span className="mt-2 grid gap-1">
          {readiness.checks.map((check) => (
            <span
              key={check.id}
              className={cn(
                "flex items-center gap-2 text-xs leading-5",
                check.isComplete ? "text-platform-secondary" : "text-[#ffd36a]"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  check.isComplete ? "bg-platform-success" : "bg-[#ffd36a]"
                )}
              />
              {check.label}
            </span>
          ))}
        </span>
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        {canMoveUp ? (
          <Button variant="ghost" className="px-3 py-2" onClick={() => onMove(recipe.id, "up")}>
            Move up
          </Button>
        ) : null}
        {canMoveDown ? (
          <Button variant="ghost" className="px-3 py-2" onClick={() => onMove(recipe.id, "down")}>
            Move down
          </Button>
        ) : null}
        <Button variant="ghost" className="px-3 py-2" onClick={() => onDuplicate(recipe.id)}>
          Duplicate plan
        </Button>
        {isConfirmingDelete ? (
          <>
            <Button variant="danger" className="px-3 py-2" onClick={() => onDelete(recipe.id)}>
              Confirm delete
            </Button>
            <Button variant="ghost" className="px-3 py-2" onClick={onCancelDelete}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant={canDelete ? "danger" : "disabled"}
            className="px-3 py-2"
            disabled={!canDelete}
            aria-describedby={!canDelete ? `delete-recipe-disabled-${recipe.id}` : undefined}
            onClick={() => onStartDelete(recipe.id)}
          >
            Delete plan
          </Button>
        )}
      </div>
      {isConfirmingDelete ? (
        <p className="mt-2 text-xs leading-5 text-platform-secondary">
          Confirm to remove this playlist plan from the Sort.
        </p>
      ) : null}
      {!canDelete ? (
        <p
          id={`delete-recipe-disabled-${recipe.id}`}
          className="mt-2 text-xs leading-5 text-platform-secondary"
        >
          Keep at least one playlist plan in this Sort.
        </p>
      ) : null}
      <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
        Plan {index + 1}
      </p>
    </article>
  );
}

function formatCategory(value: string) {
  return value
    .split("_")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
