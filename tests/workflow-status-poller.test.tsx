import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { WorkflowStatusPoller } from "@/components/app/workflow-status-poller";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

describe("WorkflowStatusPoller", () => {
  it("renders active and stopped polling states", () => {
    const activeMarkup = renderToStaticMarkup(
      <WorkflowStatusPoller isActive label="Processing status" />
    );
    const stoppedMarkup = renderToStaticMarkup(
      <WorkflowStatusPoller isActive={false} label="Processing status" />
    );

    expect(activeMarkup).toContain("Processing status auto-refresh every 3 seconds.");
    expect(stoppedMarkup).toContain("Processing status stopped.");
  });
});
