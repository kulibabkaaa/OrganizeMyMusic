"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function CreateSortButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function createSortRun() {
    startTransition(async () => {
      const response = await fetch("/api/sort-runs", {
        method: "POST"
      });
      const payload = (await response.json()) as {
        sortRun?: { id: string };
      };

      if (payload.sortRun?.id) {
        router.push(`/sorts/${payload.sortRun.id}`);
        router.refresh();
      }
    });
  }

  return (
    <Button onClick={createSortRun} className="min-w-44">
      {isPending ? "Building preview..." : "Generate preview"}
    </Button>
  );
}

