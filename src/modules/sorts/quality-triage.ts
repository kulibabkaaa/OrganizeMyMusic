import type { PreviewSelection } from "@/modules/sorts/preview-selection";
import { getVisiblePreviewTrackCount, summarizePreviewSelection } from "@/modules/sorts/preview-selection";
import type { PreviewSnapshot } from "@/modules/sorts/preview-snapshot";
import type { GeneratedPlaylistMatchStats } from "@/types/domain";

export interface QualityTriagePlaylistSummary {
  id: string;
  title: string;
  confidenceLabel: "high" | "medium";
  proposedTrackCount: number;
  selectedTrackCount: number;
  warningCount: number;
  warnings: string[];
  matchStats: GeneratedPlaylistMatchStats | null;
  topRejectionReason: string | null;
  issueTags: string[];
  suggestedNextStep: string;
}

export interface QualityTriageReport {
  sortRunId: string;
  librarySyncId: string;
  generatedAt: string;
  playlistCount: number;
  selectedPlaylistCount: number;
  proposedTrackCount: number;
  selectedTrackCount: number;
  emptyPlaylistCount: number;
  lowMatchPlaylistCount: number;
  playlists: QualityTriagePlaylistSummary[];
}

const rejectionLabels = {
  rejectedExplicitCount: "explicit",
  rejectedLanguageCount: "language",
  rejectedGenreCount: "genre",
  rejectedMoodCount: "mood",
  rejectedEnergyCount: "energy",
  belowScoreCount: "below_score"
} as const;

function topRejectionReason(stats: GeneratedPlaylistMatchStats | undefined) {
  if (!stats) {
    return null;
  }

  const [top] = Object.entries(rejectionLabels)
    .map(([key, label]) => ({
      label,
      count: stats[key as keyof typeof rejectionLabels]
    }))
    .sort((a, b) => b.count - a.count);

  return top && top.count > 0 ? top.label : null;
}

function issueTagsForPlaylist(input: {
  proposedTrackCount: number;
  warningCount: number;
  matchStats: GeneratedPlaylistMatchStats | undefined;
  topRejectionReason: string | null;
}) {
  const tags = new Set<string>();

  if (input.proposedTrackCount === 0) {
    tags.add("empty_playlist");
  } else if (input.proposedTrackCount < 5) {
    tags.add("low_match");
  }

  if (input.warningCount > 0) {
    tags.add("review_warning");
  }

  if (
    input.matchStats &&
    input.matchStats.totalTrackCount > 0 &&
    input.matchStats.missingClassificationCount / input.matchStats.totalTrackCount >= 0.1
  ) {
    tags.add("missing_classifications");
  }

  if (input.topRejectionReason) {
    tags.add(`${input.topRejectionReason}_filter`);
  }

  if (tags.size === 0) {
    tags.add("no_obvious_aggregate_issue");
  }

  return [...tags];
}

function suggestedNextStepForTags(tags: string[]) {
  if (tags.includes("empty_playlist")) {
    return "Confirm whether the request is too narrow, then add synthetic fixtures for the missing playlist pattern.";
  }

  if (tags.includes("low_match")) {
    return "Compare expected playlist size with aggregate rejection reasons before tuning score weights.";
  }

  if (tags.includes("language_filter")) {
    return "Check whether the request should allow mixed or related languages instead of a single strict language.";
  }

  if (tags.includes("genre_filter")) {
    return "Check whether related genres or subgenres should count as partial matches.";
  }

  if (tags.includes("mood_filter") || tags.includes("energy_filter")) {
    return "Check whether sparse mood or energy metadata needs a safer fallback for this request.";
  }

  if (tags.includes("below_score_filter")) {
    return "Review score threshold and reasons for near-matches before lowering the threshold.";
  }

  if (tags.includes("missing_classifications")) {
    return "Retry or improve classification coverage before tuning playlist scoring.";
  }

  return "Collect user-visible mismatch notes for this playlist before changing scoring.";
}

export function buildQualityTriageReport(
  snapshot: PreviewSnapshot,
  selection: PreviewSelection
): QualityTriageReport {
  const selectionSummary = summarizePreviewSelection(snapshot, selection);
  const playlists = snapshot.playlists.map((playlist) => {
    const topReason = topRejectionReason(playlist.matchStats);
    const issueTags = issueTagsForPlaylist({
      proposedTrackCount: playlist.tracks.length,
      warningCount: playlist.qualityWarnings?.length ?? 0,
      matchStats: playlist.matchStats,
      topRejectionReason: topReason
    });

    return {
      id: playlist.id,
      title: playlist.title,
      confidenceLabel: playlist.confidenceLabel,
      proposedTrackCount: playlist.tracks.length,
      selectedTrackCount: getVisiblePreviewTrackCount(snapshot, selection, playlist.id),
      warningCount: playlist.qualityWarnings?.length ?? 0,
      warnings: playlist.qualityWarnings ?? [],
      matchStats: playlist.matchStats ?? null,
      topRejectionReason: topReason,
      issueTags,
      suggestedNextStep: suggestedNextStepForTags(issueTags)
    };
  });

  return {
    sortRunId: snapshot.sortRunId,
    librarySyncId: snapshot.librarySyncId,
    generatedAt: snapshot.generatedAt,
    playlistCount: snapshot.playlists.length,
    selectedPlaylistCount: selectionSummary.selectedPlaylistCount,
    proposedTrackCount: snapshot.playlists.reduce(
      (count, playlist) => count + playlist.tracks.length,
      0
    ),
    selectedTrackCount: selectionSummary.selectedTrackCount,
    emptyPlaylistCount: snapshot.playlists.filter((playlist) => playlist.tracks.length === 0).length,
    lowMatchPlaylistCount: snapshot.playlists.filter(
      (playlist) => playlist.tracks.length > 0 && playlist.tracks.length < 5
    ).length,
    playlists
  };
}

export function formatQualityTriageReport(report: QualityTriageReport, notes: string) {
  const trimmedNotes = notes.trim();
  const lines = [
    "OrganizeMyMusic quality triage",
    `Sort run: ${report.sortRunId}`,
    `Generated: ${report.generatedAt}`,
    `Playlists: ${report.playlistCount} total, ${report.selectedPlaylistCount} selected`,
    `Tracks: ${report.proposedTrackCount} proposed, ${report.selectedTrackCount} selected`,
    `Empty playlists: ${report.emptyPlaylistCount}`,
    `Low-match playlists: ${report.lowMatchPlaylistCount}`,
    "",
    "Playlist summaries:"
  ];

  for (const playlist of report.playlists) {
    lines.push(
      `- ${playlist.title}: ${playlist.proposedTrackCount} proposed, ${playlist.selectedTrackCount} selected, ${playlist.confidenceLabel} confidence${
        playlist.topRejectionReason ? `, top rejection: ${playlist.topRejectionReason}` : ""
      }`
    );
    lines.push(`  tags: ${playlist.issueTags.join(", ")}`);
    lines.push(`  next: ${playlist.suggestedNextStep}`);

    if (playlist.matchStats) {
      lines.push(
        `  matched ${playlist.matchStats.matchedTrackCount}/${playlist.matchStats.totalTrackCount}; rejected language ${playlist.matchStats.rejectedLanguageCount}, genre ${playlist.matchStats.rejectedGenreCount}, mood ${playlist.matchStats.rejectedMoodCount}, energy ${playlist.matchStats.rejectedEnergyCount}, below score ${playlist.matchStats.belowScoreCount}`
      );
    }

    for (const warning of playlist.warnings) {
      lines.push(`  warning: ${warning}`);
    }
  }

  if (trimmedNotes) {
    lines.push("", "User quality notes:", trimmedNotes);
  }

  return lines.join("\n");
}
