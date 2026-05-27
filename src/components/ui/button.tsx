import React from "react";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "glass" | "ghost" | "danger" | "disabled";
}

export function Button({
  className,
  variant = "primary",
  children,
  type,
  formAction,
  disabled,
  ...props
}: PropsWithChildren<ButtonProps>) {
  const isDisabled = disabled || variant === "disabled";

  return (
    <button
      type={type ?? (formAction ? undefined : "button")}
      formAction={formAction}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink",
        variant === "primary" &&
          "bg-accent-sweep text-white shadow-pulse",
        variant === "secondary" &&
          "border border-white/15 bg-white text-black shadow-none",
        variant === "glass" &&
          "border border-white/15 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur hover:bg-white/[0.14]",
        variant === "ghost" && "text-platform-secondary hover:bg-white/5 hover:text-white",
        variant === "danger" &&
          "border border-[rgba(255,77,109,0.35)] bg-[rgba(255,77,109,0.10)] text-platform-danger hover:bg-[rgba(255,77,109,0.15)]",
        isDisabled && "cursor-not-allowed opacity-55 hover:translate-y-0",
        !isDisabled && "hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
