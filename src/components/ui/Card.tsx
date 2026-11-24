import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}

export function Card({ children, className = "", as: Tag = "div" }: CardProps) {
  return (
    <Tag
      className={`rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-ink)] ${className}`}
    >
      {children}
    </Tag>
  );
}
