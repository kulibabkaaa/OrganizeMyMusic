import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({
  className,
  variant = "primary",
  children,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5",
        variant === "primary" &&
          "bg-accent-sweep text-white shadow-pulse",
        variant === "secondary" &&
          "border border-black/10 bg-white text-black",
        variant === "ghost" && "text-black/70",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

