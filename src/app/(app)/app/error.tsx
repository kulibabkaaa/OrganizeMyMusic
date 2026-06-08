"use client";

import { AppRouteError } from "@/components/app/app-route-error";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppRouteError reset={reset} />;
}
