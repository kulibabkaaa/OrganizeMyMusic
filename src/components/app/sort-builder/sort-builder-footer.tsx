import React from "react";

import { Button } from "@/components/ui/button";

export type AutosaveStatus = {
  state: "idle" | "saving" | "saved" | "failed";
  message: string;
  detail: string | null;
  canRetry: boolean;
};

export function AutosaveStatusBadge({
  status,
  id
}: {
  status: AutosaveStatus;
  id?: string;
}) {
  const statusTone =
    status.state === "failed"
      ? "border-[rgba(255,77,109,0.32)] bg-[rgba(255,77,109,0.12)] text-platform-danger"
      : status.state === "saved"
        ? "border-[rgba(57,217,138,0.25)] bg-[rgba(57,217,138,0.10)] text-platform-success"
        : "border-white/10 bg-white/[0.06] text-platform-secondary";

  return (
    <div
      id={id}
      className={[
        "flex w-full max-w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-full border px-3 py-1.5 text-sm sm:w-fit",
        statusTone
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <span className="font-semibold">{status.message}</span>
      {status.detail ? (
        <span className="min-w-0 max-w-full basis-full break-words text-platform-secondary sm:basis-auto">
          {status.detail}
        </span>
      ) : null}
    </div>
  );
}

export function SortBuilderFooter({
  plannedCount,
  canPreview,
  previewHref,
  message,
  isSaving,
  autosaveStatus,
  onPreview,
  onRetrySave
}: {
  plannedCount: number;
  canPreview: boolean;
  previewHref: string | null;
  message: string | null;
  isSaving: boolean;
  autosaveStatus: AutosaveStatus;
  onPreview: () => void;
  onRetrySave: () => void;
}) {
  const disabledReason =
    message ?? "Complete the required Sort details before generating playlists.";
  const messageId = !canPreview ? "sort-builder-footer-message" : undefined;
  const savingMessageId = canPreview && isSaving ? "sort-builder-saving-message" : undefined;
  const autosaveStatusId = "sort-builder-autosave-status";
  const previewDescriptionIds = [
    savingMessageId,
    canPreview ? undefined : messageId,
    autosaveStatus.state === "saving" || autosaveStatus.state === "failed" ? autosaveStatusId : undefined
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <footer className="sticky bottom-4 z-10 rounded-[1.5rem] border border-white/10 bg-[#130d0f]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-sm text-white">
            {plannedCount} {plannedCount === 1 ? "playlist" : "playlists"} planned
          </p>
          <div className="mt-2">
            <AutosaveStatusBadge status={autosaveStatus} id={autosaveStatusId} />
          </div>
          {!canPreview ? (
            <p id={messageId} className="mt-1 text-sm text-platform-secondary">
              {disabledReason}
            </p>
          ) : null}
          {canPreview && isSaving ? (
            <p id={savingMessageId} className="mt-1 text-sm text-platform-secondary">
              Saving changes before preview.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          {autosaveStatus.canRetry ? (
            <Button variant="glass" aria-describedby={autosaveStatusId} onClick={onRetrySave}>
              Retry save
            </Button>
          ) : null}
          {canPreview && previewHref ? (
            <Button
              disabled={isSaving}
              aria-describedby={previewDescriptionIds || undefined}
              onClick={onPreview}
            >
              {isSaving ? "Saving..." : "Generate Playlists"}
            </Button>
          ) : (
            <Button variant="disabled" aria-describedby={previewDescriptionIds || undefined}>
              Generate Playlists
            </Button>
          )}
        </div>
      </div>
    </footer>
  );
}
