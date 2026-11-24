import { Card } from "@/components/ui/Card";
import type { ForecastDay } from "@/types";
import { WeatherIcon } from "./WeatherIcon";

interface ForecastDaysProps {
  days: ForecastDay[];
}

export function ForecastDays({ days }: ForecastDaysProps) {
  return (
    <Card as="section" className="p-5">
      <h2 className="title-section font-bold text-[var(--color-ink)]">
        Ringkasan 3 hari ke depan
      </h2>
      <div className="mt-4 divide-y divide-[var(--color-border-subtle)]">
        {days.map((day) => (
          <div
            key={day.date}
            className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
          >
            <div className="min-w-[130px]">
              <p className="text-sm font-bold text-[var(--color-ink)]">
                {day.dayLabel}
              </p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {day.slots.length} slot prakiraan
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <WeatherIcon code={day.dominantWeatherCode} size={28} />
              <span className="text-sm font-medium text-[var(--color-ink)]">
                {day.dominantWeatherDesc}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="tabular-nums text-xs font-medium text-[var(--color-ink-muted)]">
                Hujan {day.totalRainMm} mm
              </span>
              <span className="tabular-nums font-bold text-[var(--color-ink)]">
                {day.minTempC}° / {day.maxTempC}°
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
