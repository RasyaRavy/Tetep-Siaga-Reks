"use client";

import { WeatherIcon } from "@/components/weather/WeatherIcon";
import type { KecamatanShape, KecamatanWeatherSummary } from "@/types";

interface MapTooltipProps {
  kecamatan: KecamatanShape;
  summary: KecamatanWeatherSummary | undefined;
  xPx: number;
  yPx: number;
  containerWidth: number;
  isTouchPinned: boolean;
  onSelect: (kecamatan: KecamatanShape) => void;
}

export function MapTooltip({
  kecamatan,
  summary,
  xPx,
  yPx,
  containerWidth,
  isTouchPinned,
  onSelect,
}: MapTooltipProps) {
  const halfCard = 124;
  const clampedX = Math.max(
    halfCard + 12,
    Math.min(Math.max(halfCard + 12, containerWidth - halfCard - 12), xPx),
  );
  const showBelow = yPx < 150;
  const clampedY = Math.max(76, yPx);

  return (
    <div
      role="tooltip"
      style={{
        left: `${clampedX}px`,
        top: `${clampedY}px`,
        transform: showBelow
          ? "translate(-50%, 18px)"
          : "translate(-50%, calc(-100% - 16px))",
      }}
      className={`fixed z-30 w-60 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-tooltip-bg)] p-3.5 text-[var(--color-ink)] shadow-xl backdrop-blur-md ${
        isTouchPinned ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <span className="inline-block rounded-md bg-[var(--color-surface-subtle)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-accent)]">
            {kecamatan.kotkab}
          </span>
          <p className="mt-1 truncate text-sm font-extrabold leading-snug text-[var(--color-ink)]">
            Kec. {kecamatan.name}
          </p>
          <p className="text-[11px] font-medium text-[var(--color-ink-muted)]">
            {kecamatan.desaCount} desa/kelurahan
          </p>
        </div>
        {summary && <WeatherIcon code={summary.weatherCode} size={34} />}
      </div>

      {summary && (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-[var(--radius-control)] bg-[var(--color-surface-subtle)] px-3 py-2">
          <span className="tabular-nums text-2xl font-extrabold leading-none text-[var(--color-ink)]">
            {summary.tempC}°C
          </span>
          <span className="truncate text-xs font-semibold text-[var(--color-ink-muted)]">
            {summary.weatherDesc}
          </span>
        </div>
      )}

      {isTouchPinned ? (
        <button
          type="button"
          onClick={() => onSelect(kecamatan)}
          className="mt-2.5 flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-[var(--color-accent)] px-3 text-xs font-bold text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-hover)]"
        >
          Lihat detail {kecamatan.name}
        </button>
      ) : (
        <p className="mt-2 text-[11px] font-bold text-[var(--color-accent)]">
          Klik wilayah untuk terbang &amp; lihat data
        </p>
      )}
    </div>
  );
}
