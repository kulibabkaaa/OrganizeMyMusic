import type {
  PlaylistRecipe,
  PlaylistRecipeDuplicatePolicy,
  PlaylistRecipeTag
} from "@/types/domain";
import { isSupportedPlaylistRecipeTagCategory } from "@/modules/playlist-recipes/tags";

const DEFAULT_TARGET_TRACK_MIN = 25;
const DEFAULT_TARGET_TRACK_MAX = 50;
const MAX_TARGET_TRACK_COUNT = 500;

export interface BuilderRecipe {
  id: string;
  persistedId?: string;
  position: number;
  name: string;
  playlistNote: string | null;
  targetTrackMin: number | null;
  targetTrackMax: number | null;
  duplicatePolicy: PlaylistRecipeDuplicatePolicy;
  allowExplicit: boolean;
  includeLibraryOnly: boolean;
  tags: PlaylistRecipeTag[];
}

export type BuilderRecipeReadinessCheckId = "name" | "supported_tags" | "target_size";

export interface BuilderRecipeReadinessCheck {
  id: BuilderRecipeReadinessCheckId;
  label: string;
  isComplete: boolean;
}

export interface BuilderRecipeReadiness {
  recipeId: string;
  planLabel: string;
  isReady: boolean;
  summary: string;
  checks: BuilderRecipeReadinessCheck[];
  saveBlocker: string | null;
  previewBlocker: string | null;
}

export function playlistRecipeToBuilderRecipe(recipe: PlaylistRecipe): BuilderRecipe {
  return {
    id: recipe.id,
    persistedId: recipe.id,
    position: recipe.position,
    name: recipe.name,
    playlistNote: recipe.playlistNote,
    targetTrackMin: recipe.targetTrackMin ?? DEFAULT_TARGET_TRACK_MIN,
    targetTrackMax: recipe.targetTrackMax ?? DEFAULT_TARGET_TRACK_MAX,
    duplicatePolicy: recipe.duplicatePolicy,
    allowExplicit: recipe.allowExplicit,
    includeLibraryOnly: recipe.includeLibraryOnly,
    tags: recipe.tags
  };
}

export function createDefaultBuilderRecipe(position: number): BuilderRecipe {
  return {
    id: `local_${Date.now()}_${position}`,
    position,
    name: "New playlist",
    playlistNote: null,
    targetTrackMin: DEFAULT_TARGET_TRACK_MIN,
    targetTrackMax: DEFAULT_TARGET_TRACK_MAX,
    duplicatePolicy: "avoid_duplicates",
    allowExplicit: true,
    includeLibraryOnly: true,
    tags: [
      {
        id: `tag_${Date.now()}_${position}`,
        category: "mood",
        value: "Chill"
      }
    ]
  };
}

export function duplicateBuilderRecipe(recipe: BuilderRecipe, position: number): BuilderRecipe {
  return {
    ...recipe,
    id: `local_${Date.now()}_${position}`,
    persistedId: undefined,
    position,
    name: `${recipe.name} copy`,
    tags: recipe.tags.map((tag, index) => ({
      ...tag,
      id: `tag_${Date.now()}_${position}_${index}`
    }))
  };
}

export function moveBuilderRecipe(
  recipes: BuilderRecipe[],
  recipeId: string,
  direction: "up" | "down"
) {
  const index = recipes.findIndex((recipe) => recipe.id === recipeId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= recipes.length) {
    return recipes;
  }

  const next = recipes.slice();
  const [recipe] = next.splice(index, 1);
  next.splice(targetIndex, 0, recipe);

  return next.map((item, position) => ({
    ...item,
    position
  }));
}

export function validateSortBuilder(input: {
  sortName: string;
  recipes: BuilderRecipe[];
  previewCanRun: boolean;
}) {
  const hasSortName = input.sortName.trim().length > 0;
  const hasRecipes = input.recipes.length > 0;

  if (!hasSortName || !hasRecipes) {
    return {
      canSave: false,
      canPreview: false,
      message: "Name this Sort and add at least one playlist recipe."
    };
  }

  const readiness = input.recipes.map((recipe, index) => getBuilderRecipeReadiness(recipe, index));
  const saveBlocker = readiness.find((item) => item.saveBlocker)?.saveBlocker ?? null;

  if (saveBlocker) {
    return {
      canSave: false,
      canPreview: false,
      message: saveBlocker
    };
  }

  const previewBlocker = readiness.find((item) => item.previewBlocker)?.previewBlocker ?? null;
  if (previewBlocker) {
    return {
      canSave: true,
      canPreview: false,
      message: previewBlocker
    };
  }

  if (!input.previewCanRun) {
    return {
      canSave: true,
      canPreview: false,
      message: "You can save this draft now. Preview becomes available when the library index is ready."
    };
  }

  return {
    canSave: true,
    canPreview: true,
    message: null
  };
}

export function getBuilderRecipeReadiness(recipe: BuilderRecipe, index = recipe.position): BuilderRecipeReadiness {
  const planLabel = getRecipePlanLabel(recipe, index);
  const hasName = recipe.name.trim().length > 0;
  const hasSupportedTag = recipe.tags.some((tag) => isSupportedPlaylistRecipeTagCategory(tag.category));
  const targetSizeMessage = getTargetSizeValidationMessage(recipe);
  const hasValidTargetSize = targetSizeMessage === null;

  const checks: BuilderRecipeReadinessCheck[] = [
    {
      id: "name",
      label: hasName ? "Named" : "Add name",
      isComplete: hasName
    },
    {
      id: "supported_tags",
      label: hasSupportedTag ? "Supported tag added" : "Add supported tag",
      isComplete: hasSupportedTag
    },
    {
      id: "target_size",
      label: hasValidTargetSize ? "Target size valid" : "Fix target size",
      isComplete: hasValidTargetSize
    }
  ];

  const missingChecks = checks.filter((check) => !check.isComplete);
  const saveBlocker = !hasName
    ? `Name ${planLabel} before saving.`
    : targetSizeMessage
      ? `Fix target size for ${planLabel}: ${targetSizeMessage}`
      : null;
  const previewBlocker = saveBlocker
    ? saveBlocker
    : !hasSupportedTag
      ? `Add at least one supported tag to ${planLabel} before preview.`
      : null;

  return {
    recipeId: recipe.id,
    planLabel,
    isReady: missingChecks.length === 0,
    summary: missingChecks.length === 0 ? "Ready for preview" : missingChecks[0].label,
    checks,
    saveBlocker,
    previewBlocker
  };
}

export function getTargetSizeValidationMessage(
  recipe: Pick<BuilderRecipe, "targetTrackMin" | "targetTrackMax">
) {
  if (recipe.targetTrackMin == null || recipe.targetTrackMax == null) {
    return "Set a minimum and maximum target size for every playlist recipe.";
  }

  if (recipe.targetTrackMin > recipe.targetTrackMax) {
    return "Keep each playlist recipe target minimum less than or equal to its maximum.";
  }

  if (recipe.targetTrackMin < 1 || recipe.targetTrackMax < 1) {
    return "Keep every playlist recipe target size at one track or more.";
  }

  if (
    recipe.targetTrackMin > MAX_TARGET_TRACK_COUNT ||
    recipe.targetTrackMax > MAX_TARGET_TRACK_COUNT
  ) {
    return "Keep every playlist recipe target size at 500 tracks or fewer.";
  }

  return null;
}

function getRecipePlanLabel(recipe: Pick<BuilderRecipe, "name">, index: number) {
  const name = recipe.name.trim();
  return name ? `"${name}"` : `Plan ${index + 1}`;
}
