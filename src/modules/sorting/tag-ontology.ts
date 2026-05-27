import type {
  GenreLabel,
  MoodLabel,
  PlaylistRecipeTagCategory,
  TrackLanguage
} from "@/types/domain";

export type SupportedCanonicalTagCategory = "mood" | "genre" | "language" | "energy" | "activity";

export const supportedCanonicalTagCategories = [
  "mood",
  "genre",
  "language",
  "energy",
  "activity"
] as const satisfies readonly SupportedCanonicalTagCategory[];

export type CanonicalTagResult =
  | {
      status: "supported";
      category: "mood";
      value: MoodLabel;
    }
  | {
      status: "supported";
      category: "genre";
      value: GenreLabel;
    }
  | {
      status: "supported";
      category: "language";
      value: TrackLanguage;
    }
  | {
      status: "supported";
      category: "energy";
      value: "low" | "medium" | "high";
    }
  | {
      status: "supported";
      category: "activity";
      value: "focus" | "workout" | "driving" | "late_night" | "party" | "cooking";
    }
  | {
      status: "unsupported";
      category: PlaylistRecipeTagCategory;
      value: string;
      reason: "unsupported_category" | "unknown_value";
    };

const languageValues: Record<string, TrackLanguage> = {
  english: "english",
  ukrainian: "ukrainian",
  russian: "russian",
  polish: "polish",
  spanish: "spanish",
  french: "french",
  german: "german",
  japanese: "japanese",
  korean: "korean",
  portuguese: "portuguese",
  instrumental: "instrumental",
  mixed: "mixed",
  "mixed language": "mixed",
  unknown: "unknown"
};

const genreValues: Record<string, GenreLabel> = {
  pop: "Pop",
  rap: "Hip-Hop/Rap",
  "hip hop": "Hip-Hop/Rap",
  "hip hop/rap": "Hip-Hop/Rap",
  "hip-hop": "Hip-Hop/Rap",
  "hip-hop/rap": "Hip-Hop/Rap",
  trap: "Hip-Hop/Rap",
  rock: "Rock",
  "r&b": "R&B/Soul",
  soul: "R&B/Soul",
  electronic: "Electronic",
  dance: "Electronic",
  indie: "Indie/Alternative",
  alternative: "Indie/Alternative",
  latin: "Latin",
  country: "Country",
  jazz: "Jazz",
  classical: "Classical",
  metal: "Metal",
  folk: "Folk/Acoustic",
  acoustic: "Folk/Acoustic",
  "k-pop": "K-Pop",
  "k pop": "K-Pop",
  kpop: "K-Pop",
  "j-pop": "J-Pop",
  "j pop": "J-Pop",
  jpop: "J-Pop",
  gospel: "Gospel/Christian",
  christian: "Gospel/Christian",
  reggae: "Reggae",
  soundtrack: "Soundtrack"
};

const moodValues: Record<string, MoodLabel> = {
  chill: "Chill",
  calm: "Chill",
  relaxed: "Chill",
  hype: "Hype",
  energetic: "Hype",
  focus: "Focus",
  study: "Focus",
  sad: "Sad",
  heartbreak: "Sad",
  heartbroken: "Sad",
  romantic: "Romantic",
  workout: "Workout",
  gym: "Workout",
  "feel good": "Feel-Good",
  "feel-good": "Feel-Good",
  happy: "Feel-Good",
  melancholy: "Melancholy",
  melancholic: "Melancholy",
  dark: "Dark",
  party: "Party",
  driving: "Driving",
  drive: "Driving",
  "late night": "Late-Night",
  "late-night": "Late-Night",
  night: "Late-Night"
};

const energyValues: Record<string, Extract<CanonicalTagResult, { category: "energy" }>["value"]> = {
  low: "low",
  calm: "low",
  quiet: "low",
  warm: "low",
  medium: "medium",
  balanced: "medium",
  mid: "medium",
  high: "high",
  hype: "high",
  upbeat: "high",
  intense: "high"
};

const activityValues: Record<string, Extract<CanonicalTagResult, { category: "activity" }>["value"]> = {
  focus: "focus",
  work: "focus",
  study: "focus",
  workout: "workout",
  gym: "workout",
  running: "workout",
  run: "workout",
  driving: "driving",
  drive: "driving",
  commute: "driving",
  "late night": "late_night",
  "late-night": "late_night",
  night: "late_night",
  party: "party",
  cooking: "cooking"
};

export function normalizeTagValue(value: string) {
  return value.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

export function isCanonicalTagCategory(
  category: PlaylistRecipeTagCategory
): category is SupportedCanonicalTagCategory {
  return supportedCanonicalTagCategories.includes(category as SupportedCanonicalTagCategory);
}

export function normalizePlaylistRecipeTag(input: {
  category: PlaylistRecipeTagCategory;
  value: string;
}): CanonicalTagResult {
  const value = normalizeTagValue(input.value);

  if (!isCanonicalTagCategory(input.category)) {
    return {
      status: "unsupported",
      category: input.category,
      value: input.value.trim(),
      reason: "unsupported_category"
    };
  }

  if (input.category === "language") {
    return toCanonicalResult(input, languageValues[value]);
  }

  if (input.category === "genre") {
    return toCanonicalResult(input, genreValues[value]);
  }

  if (input.category === "mood") {
    return toCanonicalResult(input, moodValues[value]);
  }

  if (input.category === "energy") {
    return toCanonicalResult(input, energyValues[value]);
  }

  return toCanonicalResult(input, activityValues[value]);
}

function toCanonicalResult(
  input: { category: PlaylistRecipeTagCategory; value: string },
  canonicalValue: GenreLabel | MoodLabel | TrackLanguage | "low" | "medium" | "high" | "focus" | "workout" | "driving" | "late_night" | "party" | "cooking" | undefined
): CanonicalTagResult {
  if (!canonicalValue) {
    return {
      status: "unsupported",
      category: input.category,
      value: input.value.trim(),
      reason: "unknown_value"
    };
  }

  if (input.category === "language") {
    return { status: "supported", category: "language", value: canonicalValue as TrackLanguage };
  }

  if (input.category === "genre") {
    return { status: "supported", category: "genre", value: canonicalValue as GenreLabel };
  }

  if (input.category === "mood") {
    return { status: "supported", category: "mood", value: canonicalValue as MoodLabel };
  }

  if (input.category === "energy") {
    return {
      status: "supported",
      category: "energy",
      value: canonicalValue as Extract<CanonicalTagResult, { category: "energy" }>["value"]
    };
  }

  return {
    status: "supported",
    category: "activity",
    value: canonicalValue as Extract<CanonicalTagResult, { category: "activity" }>["value"]
  };
}
