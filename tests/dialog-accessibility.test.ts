import { describe, expect, it } from "vitest";

import { getNextDialogFocusIndex } from "@/components/ui/dialog-accessibility";

describe("dialog accessibility helpers", () => {
  it("wraps focus from the first and last dialog controls", () => {
    expect(
      getNextDialogFocusIndex({
        focusableCount: 3,
        currentIndex: 2,
        shiftKey: false
      })
    ).toBe(0);
    expect(
      getNextDialogFocusIndex({
        focusableCount: 3,
        currentIndex: 0,
        shiftKey: true
      })
    ).toBe(2);
  });

  it("moves unknown focus into the dialog and ignores empty dialogs", () => {
    expect(
      getNextDialogFocusIndex({
        focusableCount: 2,
        currentIndex: -1,
        shiftKey: false
      })
    ).toBe(0);
    expect(
      getNextDialogFocusIndex({
        focusableCount: 0,
        currentIndex: -1,
        shiftKey: false
      })
    ).toBeNull();
  });
});
