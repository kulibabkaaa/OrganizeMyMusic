"use client";

import { useEffect, type KeyboardEvent, type RefObject } from "react";

const dialogFocusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export function getNextDialogFocusIndex({
  focusableCount,
  currentIndex,
  shiftKey
}: {
  focusableCount: number;
  currentIndex: number;
  shiftKey: boolean;
}) {
  if (focusableCount <= 0) {
    return null;
  }

  if (currentIndex === -1) {
    return shiftKey ? focusableCount - 1 : 0;
  }

  if (shiftKey && currentIndex === 0) {
    return focusableCount - 1;
  }

  if (!shiftKey && currentIndex === focusableCount - 1) {
    return 0;
  }

  return null;
}

export function getFocusableDialogElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(dialogFocusableSelector)).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.tabIndex !== -1
  );
}

export function useDialogAccessibility({
  isOpen,
  dialogRef,
  onClose,
  closeDisabled = false
}: {
  isOpen: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    const firstFocusable = getFocusableDialogElements(dialog)[0];
    (firstFocusable ?? dialog).focus();

    return () => {
      previousFocus?.focus();
    };
  }, [dialogRef, isOpen]);

  function onDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      if (!closeDisabled) {
        event.preventDefault();
        onClose();
      }
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) {
      return;
    }

    const focusableElements = getFocusableDialogElements(dialogRef.current);
    const currentIndex = focusableElements.findIndex((element) => element === event.target);
    const nextIndex = getNextDialogFocusIndex({
      focusableCount: focusableElements.length,
      currentIndex,
      shiftKey: event.shiftKey
    });

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    focusableElements[nextIndex]?.focus();
  }

  return { onDialogKeyDown };
}
