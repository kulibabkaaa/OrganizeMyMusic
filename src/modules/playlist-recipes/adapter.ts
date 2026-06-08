import type { PlaylistRequestRules, ParsedPlaylistRequest } from "@/modules/playlist-requests/parser";
import { normalizePlaylistRecipeTag } from "@/modules/sorting/tag-ontology";
import type {
  PlaylistRecipe,
  PlaylistRecipeTag
} from "@/types/domain";

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

export function playlistRecipeToParsedRequest(recipe: PlaylistRecipe): ParsedPlaylistRequest {
  const rules = recipe.tags.reduce<PlaylistRequestRules>(
    (currentRules, tag) => mergeTagIntoRules(currentRules, tag),
    {
      title: recipe.name,
      languages: [],
      genres: [],
      subgenres: [],
      moods: [],
      energyMin: null,
      energyMax: null,
      excludeExplicit: !recipe.allowExplicit,
      source: "heuristic"
    }
  );

  return {
    userPrompt: recipe.name,
    parsedRules: {
      ...rules,
      languages: unique(rules.languages),
      genres: unique(rules.genres),
      subgenres: unique(rules.subgenres),
      moods: unique(rules.moods)
    }
  };
}

export function playlistRecipesToParsedRequests(recipes: PlaylistRecipe[]) {
  return recipes
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((recipe) => playlistRecipeToParsedRequest(recipe));
}

function mergeTagIntoRules(rules: PlaylistRequestRules, tag: PlaylistRecipeTag) {
  const tagResult = normalizePlaylistRecipeTag(tag);

  if (tagResult.status === "unsupported") {
    return tagResult.reason === "unsupported_category"
      ? { ...rules, subgenres: [...rules.subgenres, tag.value.trim()] }
      : rules;
  }

  if (tagResult.category === "language") {
    return { ...rules, languages: [...rules.languages, tagResult.value] };
  }

  if (tagResult.category === "genre") {
    return { ...rules, genres: [...rules.genres, tagResult.value] };
  }

  if (tagResult.category === "mood") {
    return { ...rules, moods: [...rules.moods, tagResult.value] };
  }

  if (tagResult.category === "energy") {
    return mergeEnergyTag(rules, tagResult.value);
  }

  return mergeActivityTag(rules, tagResult.value);
}

function mergeEnergyTag(
  rules: PlaylistRequestRules,
  value: "low" | "medium" | "high"
): PlaylistRequestRules {
  if (value === "high") {
    return { ...rules, energyMin: Math.max(rules.energyMin ?? 0, 0.65) };
  }

  if (value === "low") {
    return { ...rules, energyMax: Math.min(rules.energyMax ?? 1, 0.55) };
  }

  return {
    ...rules,
    energyMin: Math.max(rules.energyMin ?? 0, 0.35),
    energyMax: Math.min(rules.energyMax ?? 1, 0.75)
  };
}

function mergeActivityTag(
  rules: PlaylistRequestRules,
  value: "focus" | "workout" | "driving" | "late_night" | "party" | "cooking"
): PlaylistRequestRules {
  if (value === "workout") {
    return {
      ...rules,
      moods: [...rules.moods, "Workout", "Hype"],
      energyMin: Math.max(rules.energyMin ?? 0, 0.65)
    };
  }

  if (value === "driving") {
    return {
      ...rules,
      moods: [...rules.moods, "Driving"],
      energyMin: Math.max(rules.energyMin ?? 0, 0.45)
    };
  }

  if (value === "focus") {
    return { ...rules, moods: [...rules.moods, "Focus"] };
  }

  if (value === "late_night") {
    return {
      ...rules,
      moods: [...rules.moods, "Late-Night", "Chill"],
      energyMax: Math.min(rules.energyMax ?? 1, 0.6)
    };
  }

  return rules;
}
