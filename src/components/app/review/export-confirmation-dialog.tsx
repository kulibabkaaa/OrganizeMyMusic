"use client";

import React, { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDialogAccessibility } from "@/components/ui/dialog-accessibility";
import type { ReviewSelectionSummary } from "@/modules/sorts/review-selection";

export function ExportConfirmationDialog({
  isOpen,
  summary,
  isSubmitting = false,
  errorMessage,
  statusMessage,
  onClose,
  onConfirm = () => undefined
}: {
  isOpen: boolean;
  summary: ReviewSelectionSummary;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  statusMessage?: string | null;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { onDialogKeyDown } = useDialogAccessibility({
    isOpen,
    dialogRef,
    onClose,
    closeDisabled: isSubmitting
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-confirmation-title"
      aria-describedby="export-confirmation-description"
      tabIndex={-1}
      onKeyDown={onDialogKeyDown}
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-sm"
    >
      <Card elevated className="w-full max-w-lg space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-platform-muted">
            Explicit confirmation required
          </p>
          <h2
            id="export-confirmation-title"
            className="mt-2 font-display text-2xl font-semibold tracking-[0em] text-white"
          >
            Confirm Apple Music export
          </h2>
          <p id="export-confirmation-description" className="mt-3 text-sm leading-7 text-platform-secondary">
            Create {summary.selectedPlaylistCount} Apple Music playlists and add{" "}
            {summary.selectedTrackCount} approved tracks?
          </p>
        </div>

        <p className="rounded-2xl border border-[rgba(255,77,109,0.28)] bg-[rgba(255,77,109,0.10)] p-4 text-sm leading-6 text-platform-secondary">
          Organize Your Music will create new Apple Music playlists only and add approved tracks from this review.
          Existing Apple Music playlists will not be replaced, reordered, or removed.
        </p>

        {errorMessage ? (
          <p className="rounded-2xl border border-[rgba(255,77,109,0.28)] bg-[rgba(255,77,109,0.10)] p-4 text-sm text-platform-danger">
            {errorMessage}
          </p>
        ) : null}

        {statusMessage ? (
          <p className="rounded-2xl border border-[rgba(57,217,138,0.25)] bg-[rgba(57,217,138,0.10)] p-4 text-sm text-platform-success">
            {statusMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting || summary.selectedPlaylistCount === 0}
          >
            {isSubmitting ? "Queueing..." : "Create Apple Music playlists"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
