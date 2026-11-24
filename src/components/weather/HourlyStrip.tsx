import { Card } from "@/components/ui/Card";
import type { ForecastSlot } from "@/types";
import { WeatherIcon } from "./WeatherIcon";

interface HourlyStripProps {
  slots: ForecastSlot[];
  regionName: string;
}

export function HourlyStrip({ slots, regionName }: HourlyStripProps) {
  return (
    <Card as="section" className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="title-section font-bold text-[var(--color-ink)]">
          Prakiraan per 3 jam di {regionName}
        </h2>
        <span className="text-xs font-medium text-[var(--color-ink-muted)]">
          Waktu Indonesia Barat (WIB)
        </span>
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {slots.map((slot) => (
          <div
            key={slot.utcDatetime}
            className="flex min-w-[104px] shrink-0 flex-col items-center rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 py-3 text-center"
          >
            <span className="tabular-nums text-xs font-semibold text-[var(--color-ink-muted)]">
              {slot.wibTime}
            </span>
            <WeatherIcon code={slot.weatherCode} size={32} className="my-2" />
            <span className="tabular-nums text-lg font-bold text-[var(--color-ink)]">
              {slot.tempC}°C
            </span>
            <span className="mt-1 line-clamp-1 text-[11px] text-[var(--color-ink-muted)]">
              {slot.weatherDesc}
            </span>
            <span className="tabular-nums mt-1 text-[11px] font-medium text-[var(--color-accent)]">
              {slot.rainMm > 0 ? `${slot.rainMm} mm` : "0 mm"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
