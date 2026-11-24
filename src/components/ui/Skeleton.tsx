interface SkeletonProps {
  label: string;
  className?: string;
}

export function Skeleton({ label, className = "h-24 w-full" }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`skeleton-fade rounded-[var(--radius-card)] bg-[var(--color-surface-subtle)] ${className}`}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}
