import type { PaymentStatus, SortRunState } from "@/types/domain";

export type ProcessingStepId =
  | "preparing_library"
  | "classifying_tracks"
  | "building_playlists"
  | "removing_duplicates"
  | "preparing_review"
  | "ready";

export type ProcessingStepStatus = "done" | "live" | "pending" | "failed";

export interface ProcessingStep {
  id: ProcessingStepId;
  label: string;
  status: ProcessingStepStatus;
}

export interface SortProcessingProgress {
  percent: number;
  currentStep: string;
  estimatedTimeRemaining: string | null;
  recipeCount: number;
  trackCountProcessed: number;
  status: "running" | "ready" | "failed";
  steps: ProcessingStep[];
  recoveryActionLabel?: string;
}

const processingStepDefinitions: Array<{
  id: ProcessingStepId;
  label: string;
  percent: number;
}> = [
  { id: "preparing_library", label: "Preparing library", percent: 12 },
  { id: "classifying_tracks", label: "Classifying tracks", percent: 32 },
  { id: "building_playlists", label: "Building playlists", percent: 58 },
  { id: "removing_duplicates", label: "Removing duplicates", percent: 76 },
  { id: "preparing_review", label: "Preparing review", percent: 88 },
  { id: "ready", label: "Ready", percent: 100 }
];

const stageToStep: Record<string, ProcessingStepId> = {
  preparing_library: "preparing_library",
  library: "preparing_library",
  classification: "classifying_tracks",
  classifying: "classifying_tracks",
  classifying_tracks: "classifying_tracks",
  full_sort: "building_playlists",
  processing: "building_playlists",
  building_playlists: "building_playlists",
  dedupe: "removing_duplicates",
  removing_duplicates: "removing_duplicates",
  review: "preparing_review",
  preparing_review: "preparing_review",
  ready: "ready",
  completed: "ready"
};

export const processingStepLabels = processingStepDefinitions.map((step) => step.label);

export function getSortProcessingProgress(input: {
  state: SortRunState;
  paymentStatus: PaymentStatus;
  recipeCount: number;
  trackCountProcessed: number;
  activeJobStages?: string[];
  generatedPlaylistCount?: number;
}): SortProcessingProgress {
  const status = getProcessingStatus(input);
  const currentStepId = getCurrentStepId(input, status);
  const currentStepIndex = processingStepDefinitions.findIndex((step) => step.id === currentStepId);
  const currentStep = processingStepDefinitions[currentStepIndex] ?? processingStepDefinitions[0];
  const steps = processingStepDefinitions.map((step, index) => ({
    id: step.id,
    label: step.label,
    status: getStepStatus({
      stepIndex: index,
      currentStepIndex,
      status
    })
  }));

  return {
    percent: status === "ready" ? 100 : currentStep.percent,
    currentStep: currentStep.label,
    estimatedTimeRemaining: getEstimatedTimeRemaining(currentStep.percent, status),
    recipeCount: input.recipeCount,
    trackCountProcessed: input.trackCountProcessed,
    status,
    steps,
    ...(status === "failed" ? { recoveryActionLabel: "View issue / Retry" } : {})
  };
}

function getProcessingStatus(input: {
  state: SortRunState;
  paymentStatus: PaymentStatus;
  generatedPlaylistCount?: number;
}): SortProcessingProgress["status"] {
  if (input.state === "failed" || input.paymentStatus === "failed") {
    return "failed";
  }

  if (input.generatedPlaylistCount && input.generatedPlaylistCount > 0) {
    return "ready";
  }

  return "running";
}

function getCurrentStepId(
  input: {
    activeJobStages?: string[];
    generatedPlaylistCount?: number;
  },
  status: SortProcessingProgress["status"]
): ProcessingStepId {
  if (status === "ready") {
    return "ready";
  }

  const latestStage = input.activeJobStages?.find((stage) => stageToStep[stage]);
  return latestStage ? stageToStep[latestStage] : "preparing_library";
}

function getStepStatus(input: {
  stepIndex: number;
  currentStepIndex: number;
  status: SortProcessingProgress["status"];
}): ProcessingStepStatus {
  if (input.status === "ready") {
    return "done";
  }

  if (input.stepIndex < input.currentStepIndex) {
    return "done";
  }

  if (input.stepIndex === input.currentStepIndex) {
    return input.status === "failed" ? "failed" : "live";
  }

  return "pending";
}

function getEstimatedTimeRemaining(
  percent: number,
  status: SortProcessingProgress["status"]
) {
  if (status === "ready" || status === "failed") {
    return null;
  }

  if (percent >= 80) {
    return "Almost ready";
  }

  if (percent >= 50) {
    return "About 4 min remaining";
  }

  return "About 8 min remaining";
}
