import {
  normalizePlaylistRecipeTag,
  type CanonicalTagResult
} from "@/modules/sorting/tag-ontology";
import type {
  GenreLabel,
  MoodLabel,
  PlaylistRecipe,
  PlaylistRecipeDuplicatePolicy,
  PlaylistRecipeTag,
  PlaylistRecipeTagCategory,
  TrackLanguage
} from "@/types/domain";

export const SORTING_RULE_COMPILER_VERSION = 1;

export const sortingRuleWeights = {
  genre: 0.35,
  mood: 0.16,
  activity: 0.2,
  energy: 0.1
} as const;

export type CompiledWeightedRule =
  | {
      type: "genre";
      value: GenreLabel;
      weight: number;
      sourceTagIds: string[];
    }
  | {
      type: "mood";
      value: MoodLabel;
      weight: number;
      sourceTagIds: string[];
    }
  | {
      type: "activity";
      value: ActivityRuleValue;
      weight: number;
      moodTargets: MoodLabel[];
      energyTarget: CompiledEnergyTarget | null;
      sourceTagIds: string[];
    }
  | {
      type: "energy";
      value: EnergyRuleValue;
      weight: number;
      target: CompiledEnergyTarget;
      sourceTagIds: string[];
    };

export type EnergyRuleValue = "low" | "medium" | "high";
export type ActivityRuleValue = "focus" | "workout" | "driving" | "late_night" | "party" | "cooking";

export interface CompiledEnergyTarget {
  min: number | null;
  max: number | null;
}

export interface CompiledHardRules {
  excludeExplicit: boolean;
  languages: TrackLanguage[];
}

export interface CompiledRuleWarning {
  tagId: string;
  category: PlaylistRecipeTagCategory;
  value: string;
  reason: "unsupported_category" | "unknown_value";
}

export interface CompiledPlaylistRules {
  version: typeof SORTING_RULE_COMPILER_VERSION;
  recipeId: string;
  title: string;
  targetTrackMin: number | null;
  targetTrackMax: number | null;
  duplicatePolicy: PlaylistRecipeDuplicatePolicy;
  includeLibraryOnly: boolean;
  hardRules: CompiledHardRules;
  weightedRules: CompiledWeightedRule[];
  warnings: CompiledRuleWarning[];
}

const energyTargets = {
  low: { min: null, max: 0.55 },
  medium: { min: 0.35, max: 0.75 },
  high: { min: 0.65, max: null }
} as const satisfies Record<EnergyRuleValue, CompiledEnergyTarget>;

const activityEffects = {
  focus: {
    moodTargets: ["Focus"],
    energyTarget: null
  },
  workout: {
    moodTargets: ["Workout", "Hype"],
    energyTarget: { min: 0.65, max: null }
  },
  driving: {
    moodTargets: ["Driving"],
    energyTarget: { min: 0.45, max: null }
  },
  late_night: {
    moodTargets: ["Late-Night", "Chill"],
    energyTarget: { min: null, max: 0.6 }
  },
  party: {
    moodTargets: ["Party", "Hype"],
    energyTarget: { min: 0.65, max: null }
  },
  cooking: {
    moodTargets: ["Chill", "Feel-Good"],
    energyTarget: { min: 0.35, max: 0.75 }
  }
} as const satisfies Record<
  ActivityRuleValue,
  {
    moodTargets: readonly MoodLabel[];
    energyTarget: CompiledEnergyTarget | null;
  }
>;

export function compilePlaylistRules(recipe: PlaylistRecipe): CompiledPlaylistRules {
  const languageTags = new Map<TrackLanguage, string[]>();
  const weightedRules = new Map<string, CompiledWeightedRule>();
  const warnings: CompiledRuleWarning[] = [];

  for (const tag of recipe.tags) {
    const result = normalizePlaylistRecipeTag(tag);

    if (result.status === "unsupported") {
      warnings.push({
        tagId: tag.id,
        category: result.category,
        value: result.value,
        reason: result.reason
      });
      continue;
    }

    if (result.category === "language") {
      appendMapValue(languageTags, result.value, tag.id);
      continue;
    }

    mergeWeightedRule(weightedRules, createWeightedRule(tag, result));
  }

  return {
    version: SORTING_RULE_COMPILER_VERSION,
    recipeId: recipe.id,
    title: recipe.name,
    targetTrackMin: recipe.targetTrackMin ?? null,
    targetTrackMax: recipe.targetTrackMax ?? null,
    duplicatePolicy: recipe.duplicatePolicy,
    includeLibraryOnly: recipe.includeLibraryOnly,
    hardRules: {
      excludeExplicit: !recipe.allowExplicit,
      languages: Array.from(languageTags.keys())
    },
    weightedRules: Array.from(weightedRules.values()),
    warnings
  };
}

function createWeightedRule(
  tag: PlaylistRecipeTag,
  result: Exclude<Extract<CanonicalTagResult, { status: "supported" }>, { category: "language" }>
): CompiledWeightedRule {
  if (result.category === "genre") {
    return {
      type: "genre",
      value: result.value,
      weight: sortingRuleWeights.genre,
      sourceTagIds: [tag.id]
    };
  }

  if (result.category === "mood") {
    return {
      type: "mood",
      value: result.value,
      weight: sortingRuleWeights.mood,
      sourceTagIds: [tag.id]
    };
  }

  if (result.category === "energy") {
    return {
      type: "energy",
      value: result.value,
      weight: sortingRuleWeights.energy,
      target: energyTargets[result.value],
      sourceTagIds: [tag.id]
    };
  }

  const effect = activityEffects[result.value];

  return {
    type: "activity",
    value: result.value,
    weight: sortingRuleWeights.activity,
    moodTargets: [...effect.moodTargets],
    energyTarget: effect.energyTarget,
    sourceTagIds: [tag.id]
  };
}

function mergeWeightedRule(
  rules: Map<string, CompiledWeightedRule>,
  nextRule: CompiledWeightedRule
) {
  const key = `${nextRule.type}:${nextRule.value}`;
  const existingRule = rules.get(key);

  if (!existingRule) {
    rules.set(key, nextRule);
    return;
  }

  rules.set(key, {
    ...existingRule,
    sourceTagIds: [...existingRule.sourceTagIds, ...nextRule.sourceTagIds]
  } as CompiledWeightedRule);
}

function appendMapValue<TKey>(map: Map<TKey, string[]>, key: TKey, value: string) {
  map.set(key, [...(map.get(key) ?? []), value]);
}
