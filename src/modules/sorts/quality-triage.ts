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

export function buildQualityTriageReport(
  snapshot: PreviewSnapshot,
  selection: PreviewSelection
): QualityTriageReport {
  const selectionSummary = summarizePreviewSelection(snapshot, selection);
  const playlists = snapshot.playlists.map((playlist) => ({
    id: playlist.id,
    title: playlist.title,
    confidenceLabel: playlist.confidenceLabel,
    proposedTrackCount: playlist.tracks.length,
    selectedTrackCount: getVisiblePreviewTrackCount(snapshot, selection, playlist.id),
    warningCount: playlist.qualityWarnings?.length ?? 0,
    warnings: playlist.qualityWarnings ?? [],
    matchStats: playlist.matchStats ?? null,
    topRejectionReason: topRejectionReason(playlist.matchStats)
  }));

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
