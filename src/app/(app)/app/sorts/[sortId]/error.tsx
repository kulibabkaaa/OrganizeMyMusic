"use client";

import { AppRouteError } from "@/components/app/app-route-error";

export default function SortWorkflowError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppRouteError
      reset={reset}
      title="Sort unavailable"
      subtitle="This Sort route could not load."
      heading="This Sort could not load"
      description="Try again, return to the dashboard, or view all Sorts. Nothing has been exported to Apple Music."
    />
  );
}
