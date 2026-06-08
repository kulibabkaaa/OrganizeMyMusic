import type {
  CompiledEnergyTarget,
  CompiledPlaylistRules,
  CompiledWeightedRule
} from "@/modules/sorting/rule-compiler";
import type { TrackFeatureProfile } from "@/modules/sorting/track-profile";

export type TrackScoringRejectionReason =
  | "missing_classification"
  | "explicit"
  | "language"
  | "genre"
  | "mood"
  | "activity"
  | "energy"
  | "below_score";

export type TrackScoringResult =
  | {
      status: "matched";
      profile: TrackFeatureProfile;
      score: number;
      rawScore: number;
      confidence: number;
      explanations: string[];
      matchedRuleCount: number;
    }
  | {
      status: "rejected";
      profile: TrackFeatureProfile;
      score: number;
      rawScore: number;
      confidence: number;
      reason: TrackScoringRejectionReason;
      explanations: string[];
      matchedRuleCount: number;
    };

export const DEFAULT_MINIMUM_TRACK_SCORE = 0.1;
const LANGUAGE_MATCH_WEIGHT = 0.25;

export function scoreTrackAgainstPlaylistRules(input: {
  profile: TrackFeatureProfile;
  rules: CompiledPlaylistRules;
  minimumScore?: number;
}): TrackScoringResult {
  const { profile, rules } = input;
  const minimumScore = input.minimumScore ?? DEFAULT_MINIMUM_TRACK_SCORE;
  const explanations: string[] = [];

  if (rules.hardRules.excludeExplicit && profile.explicit) {
    return rejectTrack({
      profile,
      reason: "explicit",
      explanations: ["Excluded because explicit tracks are not allowed."]
    });
  }

  if (!profile.hasClassification && needsClassification(rules)) {
    return rejectTrack({
      profile,
      reason: "missing_classification",
      explanations: ["No classification is available for this track."]
    });
  }

  let rawScore = 0;
  let matchedRuleCount = 0;
  const missedRuleTypes = new Set<TrackScoringRejectionReason>();

  if (rules.hardRules.languages.length > 0) {
    if (!profile.language || !rules.hardRules.languages.includes(profile.language)) {
      return rejectTrack({
        profile,
        reason: "language",
        explanations: [
          profile.language
            ? `Language ${profile.language} does not match ${formatList(rules.hardRules.languages)}.`
            : `Language is unknown; expected ${formatList(rules.hardRules.languages)}.`
        ]
      });
    }

    rawScore += LANGUAGE_MATCH_WEIGHT;
    matchedRuleCount += 1;
    explanations.push(`Language matches ${profile.language}.`);
  }

  for (const rule of rules.weightedRules) {
    const scoredRule = scoreWeightedRule(profile, rule);

    if (scoredRule.matched) {
      rawScore += rule.weight;
      matchedRuleCount += 1;
      explanations.push(scoredRule.explanation);
    } else {
      missedRuleTypes.add(scoredRule.reason);
    }
  }

  const normalizedRawScore = clampScore(rawScore);
  const finalScore = clampScore(normalizedRawScore * profile.confidence);

  if (finalScore < minimumScore) {
    return {
      status: "rejected",
      profile,
      score: finalScore,
      rawScore: normalizedRawScore,
      confidence: profile.confidence,
      reason: firstRejectionReason(missedRuleTypes),
      explanations:
        explanations.length > 0
          ? [...explanations, `Score ${formatScore(finalScore)} is below the minimum ${formatScore(minimumScore)}.`]
          : [`No scoring rules matched this track.`],
      matchedRuleCount
    };
  }

  return {
    status: "matched",
    profile,
    score: finalScore,
    rawScore: normalizedRawScore,
    confidence: profile.confidence,
    explanations,
    matchedRuleCount
  };
}

export function scoreTracksAgainstPlaylistRules(input: {
  profiles: TrackFeatureProfile[];
  rules: CompiledPlaylistRules;
  minimumScore?: number;
}): TrackScoringResult[] {
  return input.profiles.map((profile) =>
    scoreTrackAgainstPlaylistRules({
      profile,
      rules: input.rules,
      minimumScore: input.minimumScore
    })
  );
}

function scoreWeightedRule(
  profile: TrackFeatureProfile,
  rule: CompiledWeightedRule
):
  | {
      matched: true;
      explanation: string;
    }
  | {
      matched: false;
      reason: Extract<TrackScoringRejectionReason, "genre" | "mood" | "activity" | "energy">;
    } {
  if (rule.type === "genre") {
    return profile.genre === rule.value
      ? {
          matched: true,
          explanation: `Genre matches ${rule.value}.`
        }
      : { matched: false, reason: "genre" };
  }

  if (rule.type === "mood") {
    return profile.moods.includes(rule.value)
      ? {
          matched: true,
          explanation: `Mood matches ${rule.value}.`
        }
      : { matched: false, reason: "mood" };
  }

  if (rule.type === "energy") {
    return energyMatches(profile.energy, rule.target)
      ? {
          matched: true,
          explanation: `Energy ${formatNullableScore(profile.energy)} fits ${rule.value} range.`
        }
      : { matched: false, reason: "energy" };
  }

  const matchingMoods = rule.moodTargets.filter((mood) => profile.moods.includes(mood));
  const matchesEnergy = rule.energyTarget ? energyMatches(profile.energy, rule.energyTarget) : false;

  if (matchingMoods.length > 0 || matchesEnergy) {
    const details = [
      matchingMoods.length > 0 ? `moods ${matchingMoods.join(", ")}` : null,
      matchesEnergy && rule.energyTarget ? `energy ${formatNullableScore(profile.energy)}` : null
    ].filter((value): value is string => Boolean(value));

    return {
      matched: true,
      explanation: `Activity ${formatActivity(rule.value)} matches ${details.join(" and ")}.`
    };
  }

  return { matched: false, reason: "activity" };
}

function rejectTrack(input: {
  profile: TrackFeatureProfile;
  reason: TrackScoringRejectionReason;
  explanations: string[];
}): TrackScoringResult {
  return {
    status: "rejected",
    profile: input.profile,
    score: 0,
    rawScore: 0,
    confidence: input.profile.confidence,
    reason: input.reason,
    explanations: input.explanations,
    matchedRuleCount: 0
  };
}

function needsClassification(rules: CompiledPlaylistRules) {
  return rules.hardRules.languages.length > 0 || rules.weightedRules.length > 0;
}

function energyMatches(energy: number | null, target: CompiledEnergyTarget) {
  return (
    energy !== null &&
    (target.min === null || energy >= target.min) &&
    (target.max === null || energy <= target.max)
  );
}

function firstRejectionReason(
  reasons: Set<TrackScoringRejectionReason>
): TrackScoringRejectionReason {
  for (const reason of ["genre", "mood", "activity", "energy"] as const) {
    if (reasons.has(reason)) {
      return reason;
    }
  }

  return "below_score";
}

function clampScore(score: number) {
  return Math.min(1, Math.max(0, Number(score.toFixed(3))));
}

function formatNullableScore(score: number | null) {
  return score === null ? "unknown" : formatScore(score);
}

function formatScore(score: number) {
  return Number(score.toFixed(2)).toString();
}

function formatList(values: readonly string[]) {
  return values.join(" or ");
}

function formatActivity(value: string) {
  return value.replaceAll("_", " ");
}
