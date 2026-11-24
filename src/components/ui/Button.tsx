import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
}

const VARIANT_CLASSES = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-hover)] active:opacity-90 border border-transparent",
  secondary:
    "bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] active:opacity-90",
  ghost:
    "bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)] active:opacity-90 border border-transparent",
};

const SIZE_CLASSES = {
  md: "min-h-11 px-4 text-sm font-medium",
  sm: "min-h-11 px-3 text-sm font-medium",
};

export function Button({
  variant = "secondary",
  size = "md",
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] transition-colors disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  );
}
