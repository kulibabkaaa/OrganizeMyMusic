import type { PreviewSnapshot } from "@/modules/sorts/preview-snapshot";

export interface PreviewSelection {
  selectedPlaylistIds: string[];
  removedTrackFingerprintsByPlaylistId: Record<string, string[]>;
}

export interface PreviewSelectionSummary {
  selectedPlaylistCount: number;
  selectedTrackCount: number;
}

export function createInitialPreviewSelection(snapshot: PreviewSnapshot): PreviewSelection {
  return {
    selectedPlaylistIds: snapshot.playlists
      .filter((playlist) => playlist.tracks.length > 0)
      .map((playlist) => playlist.id),
    removedTrackFingerprintsByPlaylistId: {}
  };
}

export function togglePreviewPlaylist(
  selection: PreviewSelection,
  playlistId: string
): PreviewSelection {
  const selectedPlaylistIds = selection.selectedPlaylistIds.includes(playlistId)
    ? selection.selectedPlaylistIds.filter((id) => id !== playlistId)
    : [...selection.selectedPlaylistIds, playlistId];

  return {
    ...selection,
    selectedPlaylistIds
  };
}

export function removePreviewTrack(
  selection: PreviewSelection,
  playlistId: string,
  fingerprint: string
): PreviewSelection {
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

export function getVisiblePreviewTrackCount(
  snapshot: PreviewSnapshot,
  selection: PreviewSelection,
  playlistId: string
) {
  if (!selection.selectedPlaylistIds.includes(playlistId)) {
    return 0;
  }

  const playlist = snapshot.playlists.find((item) => item.id === playlistId);

  if (!playlist) {
    return 0;
  }

  const removedFingerprints = new Set(
    selection.removedTrackFingerprintsByPlaylistId[playlistId] ?? []
  );

  return playlist.tracks.filter((track) => !removedFingerprints.has(track.fingerprint)).length;
}

export function summarizePreviewSelection(
  snapshot: PreviewSnapshot,
  selection: PreviewSelection
): PreviewSelectionSummary {
  const selectedPlaylistCount = snapshot.playlists.filter(
    (playlist) =>
      selection.selectedPlaylistIds.includes(playlist.id) &&
      getVisiblePreviewTrackCount(snapshot, selection, playlist.id) > 0
  ).length;

  return {
    selectedPlaylistCount,
    selectedTrackCount: snapshot.playlists.reduce(
      (count, playlist) => count + getVisiblePreviewTrackCount(snapshot, selection, playlist.id),
      0
    )
  };
}
