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
  ...props
}: PropsWithChildren<ButtonProps>) {
  const buttonType = type ?? (props.formAction ? undefined : "button");

  return (
    <button
      type={buttonType}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-pink disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-accent-sweep text-white shadow-pulse hover:-translate-y-0.5",
        variant === "secondary" &&
          "border border-white/12 bg-white text-black hover:-translate-y-0.5",
        variant === "glass" &&
          "border border-white/10 bg-white/10 text-white hover:border-white/18 hover:bg-white/[0.14]",
        variant === "ghost" && "text-platform-secondary hover:bg-white/[0.06] hover:text-white",
        variant === "danger" &&
          "border border-[rgba(255,69,99,0.24)] bg-[rgba(255,69,99,0.10)] text-platform-danger hover:bg-[rgba(255,69,99,0.14)]",
        variant === "disabled" && "bg-white/[0.08] text-platform-muted",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
