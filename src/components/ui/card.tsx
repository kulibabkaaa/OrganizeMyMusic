import React from "react";
import type { HTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "article" | "section" | "div";
  elevated?: boolean;
}

export function Card({
  as: Component = "section",
  elevated = false,
  className,
  children,
  ...props
}: PropsWithChildren<CardProps>) {
  return (
    <Component
      className={cn(
        "rounded-[1.5rem] border border-platform-border bg-platform-card p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur",
        elevated && "bg-platform-elevated shadow-[0_28px_90px_rgba(0,0,0,0.32)]",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
