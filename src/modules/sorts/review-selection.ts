import type { PreviewSnapshot } from "@/modules/sorts/preview-snapshot";
import type { GeneratedPlaylist, GeneratedPlaylistTrack } from "@/types/domain";

export interface ReviewSelection {
  selectedPlaylistId: string | null;
  includedPlaylistIds: string[];
  removedTrackFingerprintsByPlaylistId: Record<string, string[]>;
  renamedPlaylistTitlesById: Record<string, string>;
}

export interface ReviewSelectionSummary {
  selectedPlaylistCount: number;
  selectedTrackCount: number;
}

export interface ReviewPlaylistView {
  playlist: GeneratedPlaylist;
  title: string;
  visibleTracks: GeneratedPlaylistTrack[];
  removedTrackCount: number;
  isIncluded: boolean;
}

export function createInitialReviewSelection(snapshot: PreviewSnapshot): ReviewSelection {
  const includedPlaylistIds = snapshot.playlists
    .filter((playlist) => playlist.tracks.length > 0)
    .map((playlist) => playlist.id);

  return {
    selectedPlaylistId: includedPlaylistIds[0] ?? null,
    includedPlaylistIds,
    removedTrackFingerprintsByPlaylistId: {},
    renamedPlaylistTitlesById: {}
  };
}

export function selectReviewPlaylist(
  selection: ReviewSelection,
  playlistId: string
): ReviewSelection {
  return {
    ...selection,
    selectedPlaylistId: playlistId
  };
}

export function removeReviewTrack(
  selection: ReviewSelection,
  playlistId: string,
  fingerprint: string
): ReviewSelection {
  const removedFingerprints = new Set(
    selection.removedTrackFingerprintsByPlaylistId[playlistId] ?? []
  );
  removedFingerprints.add(fingerprint);

  return {
    ...selection,
    removedTrackFingerprintsByPlaylistId: {
      ...selection.removedTrackFingerprintsByPlaylistId,
      [playlistId]: [...removedFingerprints]
    }
  };
}

export function keepReviewTrack(
  selection: ReviewSelection,
  playlistId: string,
  fingerprint: string
): ReviewSelection {
  const removedFingerprints = new Set(
    selection.removedTrackFingerprintsByPlaylistId[playlistId] ?? []
  );
  removedFingerprints.delete(fingerprint);

  return {
    ...selection,
    removedTrackFingerprintsByPlaylistId: {
      ...selection.removedTrackFingerprintsByPlaylistId,
      [playlistId]: [...removedFingerprints]
    }
  };
}

export function undoLastRemovedReviewTrack(
  selection: ReviewSelection,
  playlistId: string
): ReviewSelection {
  const removedFingerprints = selection.removedTrackFingerprintsByPlaylistId[playlistId] ?? [];
  const nextRemovedFingerprints = removedFingerprints.slice(0, -1);

  return {
    ...selection,
    removedTrackFingerprintsByPlaylistId: {
      ...selection.removedTrackFingerprintsByPlaylistId,
      [playlistId]: nextRemovedFingerprints
    }
  };
}

export function deleteReviewPlaylist(
  selection: ReviewSelection,
  playlistId: string
): ReviewSelection {
  const includedPlaylistIds = selection.includedPlaylistIds.filter((id) => id !== playlistId);
  const selectedPlaylistId =
    selection.selectedPlaylistId === playlistId
      ? includedPlaylistIds[0] ?? null
      : selection.selectedPlaylistId;

  return {
    ...selection,
    selectedPlaylistId,
    includedPlaylistIds
  };
}

export function restoreReviewPlaylist(
  selection: ReviewSelection,
  playlistId: string
): ReviewSelection {
  if (selection.includedPlaylistIds.includes(playlistId)) {
    return selection;
  }

  return {
    ...selection,
    selectedPlaylistId: selection.selectedPlaylistId ?? playlistId,
    includedPlaylistIds: [...selection.includedPlaylistIds, playlistId]
  };
}

export function renameReviewPlaylist(
  selection: ReviewSelection,
  playlistId: string,
  title: string
): ReviewSelection {
  return {
    ...selection,
    renamedPlaylistTitlesById: {
      ...selection.renamedPlaylistTitlesById,
      [playlistId]: title
    }
  };
}

export function getReviewPlaylistView(
  playlist: GeneratedPlaylist,
  selection: ReviewSelection
): ReviewPlaylistView {
  const removedFingerprints = new Set(
    selection.removedTrackFingerprintsByPlaylistId[playlist.id] ?? []
  );

  return {
    playlist,
    title: selection.renamedPlaylistTitlesById[playlist.id] || playlist.title,
    visibleTracks: playlist.tracks.filter((track) => !removedFingerprints.has(track.fingerprint)),
    removedTrackCount: playlist.tracks.filter((track) => removedFingerprints.has(track.fingerprint))
      .length,
    isIncluded: selection.includedPlaylistIds.includes(playlist.id)
  };
}

export function summarizeReviewSelection(
  snapshot: PreviewSnapshot,
  selection: ReviewSelection
): ReviewSelectionSummary {
  return snapshot.playlists.reduce<ReviewSelectionSummary>(
    (summary, playlist) => {
      if (!selection.includedPlaylistIds.includes(playlist.id)) {
        return summary;
      }

      const view = getReviewPlaylistView(playlist, selection);

      if (view.visibleTracks.length === 0) {
        return summary;
      }

      return {
        selectedPlaylistCount: summary.selectedPlaylistCount + 1,
        selectedTrackCount: summary.selectedTrackCount + view.visibleTracks.length
      };
    },
    { selectedPlaylistCount: 0, selectedTrackCount: 0 }
  );
}

export function getMatchedTagsForReviewTrack(track: GeneratedPlaylistTrack): string[] {
  const tags = track.reason
    .split(";")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (tags.length > 0) {
    return tags;
  }

  return [`Score ${Math.round(track.score * 100)}%`];
}
