import type { PaymentStatus, SortRunState } from "@/types/domain";

export type SortUiStatus =
  | "draft"
  | "preview_generating"
  | "preview_ready"
  | "ready_to_start"
  | "organizing"
  | "processing"
  | "ready_for_review"
  | "exporting"
  | "exported"
  | "failed";

export type SortUiStatusInput = {
  state: SortRunState;
  paymentStatus: PaymentStatus;
  hasPreviewSnapshot: boolean;
  generatedPlaylistCount: number;
  applePlaylistIdCount: number;
  activeJobStages?: string[];
};

const previewStages = new Set(["preview", "preview_generation", "playlist_planning"]);
const processingStages = new Set(["classification", "classifying", "full_sort", "processing"]);
const exportingStages = new Set([
  "create_playlists",
  "creating_playlists",
  "playlist_creation",
  "playlist_export"
]);

function hasStage(stages: string[] | undefined, expectedStages: Set<string>) {
  return stages?.some((stage) => expectedStages.has(stage)) ?? false;
}

export function getSortUiStatus(input: SortUiStatusInput): SortUiStatus {
  if (input.state === "failed" || input.paymentStatus === "failed") {
    return "failed";
  }

  if (input.state === "completed") {
    return "exported";
  }

  if (input.state === "creating_playlists" || hasStage(input.activeJobStages, exportingStages)) {
    return "exporting";
  }

  if (hasStage(input.activeJobStages, processingStages)) {
    return "processing";
  }

  if (input.state === "syncing" || input.state === "classifying") {
    return "preview_generating";
  }

  if (hasStage(input.activeJobStages, previewStages)) {
    return "preview_generating";
  }

  if (input.generatedPlaylistCount > 0 && input.applePlaylistIdCount === 0 && input.paymentStatus === "paid") {
    return "ready_for_review";
  }

  if (input.state === "paid") {
    return "organizing";
  }

  if (input.state === "awaiting_payment") {
    return "ready_to_start";
  }

  if (input.state === "preview_ready" && input.hasPreviewSnapshot) {
    return "preview_ready";
  }

  return "draft";
}

export function getSortPrimaryRoute(sortId: string, status: SortUiStatus) {
  const encodedSortId = encodeURIComponent(sortId);

  switch (status) {
    case "draft":
      return `/app/sorts/${encodedSortId}/builder`;
    case "preview_generating":
    case "preview_ready":
    case "ready_to_start":
      return `/app/sorts/${encodedSortId}/preview`;
    case "organizing":
    case "processing":
      return `/app/sorts/${encodedSortId}/processing`;
    case "ready_for_review":
    case "failed":
      return `/app/sorts/${encodedSortId}/review`;
    case "exporting":
      return `/app/sorts/${encodedSortId}/exporting`;
    case "exported":
      return `/app/sorts/${encodedSortId}/complete`;
  }
}
