import { Badge } from "@/components/ui/Badge";
import type { Alert } from "@/types";

interface AlertBannerProps {
  alert: Alert | null;
}

const SEVERITY_LABELS = {
  aman: "Aman",
  waspada: "Waspada",
  bahaya: "Bahaya",
};

const CONTAINER_STYLES = {
  aman: "border-[var(--color-safe-ink)]/30 bg-[var(--color-safe-bg)] text-[var(--color-safe-ink)]",
  waspada:
    "border-[var(--color-warn-ink)]/30 bg-[var(--color-warn-bg)] text-[var(--color-warn-ink)]",
  bahaya:
    "border-[var(--color-danger-ink)]/30 bg-[var(--color-danger-bg)] text-[var(--color-danger-ink)]",
};

export function AlertBanner({ alert }: AlertBannerProps) {
  if (!alert) return null;

  return (
    <aside
      aria-label="Peringatan dini cuaca Malang Raya"
      className={`rounded-[var(--radius-card)] border p-4 ${CONTAINER_STYLES[alert.severity]}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={alert.severity}>
            {SEVERITY_LABELS[alert.severity]}
          </Badge>
          <p className="text-sm font-bold">{alert.headline}</p>
        </div>
        <span className="tabular-nums text-xs font-semibold">
          Berlaku {alert.effectiveWib} - {alert.expiresWib}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed">{alert.description}</p>
      <p className="mt-1.5 text-xs font-semibold">
        Wilayah terdampak: {alert.affectedKecamatan.join(", ")}
      </p>
    </aside>
  );
}
