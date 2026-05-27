export type WorkflowFailureCategory =
  | "apple_music_api"
  | "authentication"
  | "configuration"
  | "database"
  | "validation"
  | "not_found"
  | "unknown";

export interface PrivacySafeFailure {
  category: WorkflowFailureCategory;
  message: string;
}

export function getWorkflowDurationMs(startedAt: number, now: () => number = Date.now) {
  return Math.max(0, now() - startedAt);
}

export function createPrivacySafeFailure(input: {
  workflowName: string;
  error: unknown;
}): PrivacySafeFailure {
  const category = categorizeWorkflowFailure(input.error);

  return {
    category,
    message: `${input.workflowName} failed. Failure category: ${category}.`
  };
}

export function createPrivacySafeJobDetails(input: {
  eventType: string;
  jobName?: string;
  jobId?: string | null;
  durationMs?: number;
  failureCategory?: WorkflowFailureCategory;
  counts?: Record<string, number>;
}) {
  return compactRecord({
    eventType: input.eventType,
    jobName: input.jobName,
    jobId: input.jobId,
    durationMs: input.durationMs,
    failureCategory: input.failureCategory,
    ...(input.counts ?? {})
  });
}

export function categorizeWorkflowFailure(error: unknown): WorkflowFailureCategory {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes("token") || message.includes("auth") || message.includes("unauthorized")) {
    return "authentication";
  }

  if (
    message.includes("apple music") ||
    message.includes("storefront") ||
    message.includes("rate limit") ||
    message.includes("library song")
  ) {
    return "apple_music_api";
  }

  if (
    message.includes("database") ||
    message.includes("supabase") ||
    message.includes("postgres") ||
    message.includes("relation") ||
    message.includes("row-level")
  ) {
    return "database";
  }

  if (
    message.includes("required") ||
    message.includes("invalid") ||
    message.includes("validation") ||
    message.includes("not ready")
  ) {
    return "validation";
  }

  if (message.includes("not found") || message.includes("missing")) {
    return "not_found";
  }

  if (message.includes("environment") || message.includes("config") || message.includes("env")) {
    return "configuration";
  }

  return "unknown";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "";
}

function compactRecord(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null)
  );
}
