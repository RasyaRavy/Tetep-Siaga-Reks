import type { ReactNode } from "react";
import type { AlertSeverity } from "@/types";

type BadgeVariant = AlertSeverity | "neutral" | "accent";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  aman: "bg-[var(--color-safe-bg)] text-[var(--color-safe-ink)]",
  waspada: "bg-[var(--color-warn-bg)] text-[var(--color-warn-ink)]",
  bahaya: "bg-[var(--color-danger-bg)] text-[var(--color-danger-ink)]",
  neutral:
    "bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] border border-[var(--color-border-subtle)]",
  accent: "bg-[var(--color-accent)] text-[var(--color-accent-ink)]",
};

export function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 py-1 text-xs font-semibold leading-none ${VARIANT_STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
