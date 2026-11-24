import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { buildLocalAdvice, computeDryWindow } from "@/lib/advice";
import { adm4ToSlug, getRegionsInKecamatan } from "@/lib/regions";
import type { Forecast } from "@/types";
import { WeatherIcon } from "./WeatherIcon";

interface NowCardProps {
  forecast: Forecast;
}

export function NowCard({ forecast }: NowCardProps) {
  const { region, current, days } = forecast;
  const todaySlots = days[0]?.slots ?? [];
  const dryWindow = computeDryWindow(todaySlots);
  const localAdvice = buildLocalAdvice(
    current,
    region.elevationTier,
    region.kecamatan,
  );
  const siblingDesas = getRegionsInKecamatan(region.adm3);

  return (
    <Card as="section" className="flex flex-col justify-between p-5 sm:p-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[var(--color-ink-muted)]">
              {region.kotkab} · Kec. {region.kecamatan}
            </p>
            <h1 className="title-region mt-0.5 font-bold text-[var(--color-ink)]">
              {region.desa}
            </h1>
          </div>
          <Badge variant="neutral">Update {forecast.updatedAtWib}</Badge>
        </div>

        {/* Hero temperature + weather condition */}
        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <p className="temp-hero tabular-nums font-bold text-[var(--color-ink)]">
              {current.tempC}°
            </p>
            <p className="mt-1 text-base font-semibold text-[var(--color-ink)]">
              {current.weatherDesc}
            </p>
          </div>
          <WeatherIcon code={current.weatherCode} size={68} />
        </div>

        {/* R6: Height-aware local advice */}
        <p className="mt-4 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {localAdvice}
        </p>

        {/* R2: Dry window summary */}
        <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3.5 py-2.5">
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {dryWindow.label}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            {dryWindow.detail}
          </p>
        </div>

        {/* 4 core weather metrics */}
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-3">
            <dt className="text-xs font-medium text-[var(--color-ink-muted)]">
              Kelembapan
            </dt>
            <dd className="tabular-nums mt-1 text-lg font-bold text-[var(--color-ink)]">
              {current.humidityPct}%
            </dd>
          </div>
          <div className="rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-3">
            <dt className="text-xs font-medium text-[var(--color-ink-muted)]">
              Angin ({current.windDir})
            </dt>
            <dd className="tabular-nums mt-1 text-lg font-bold text-[var(--color-ink)]">
              {current.windSpeedKmh} km/jam
            </dd>
          </div>
          <div className="rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-3">
            <dt className="text-xs font-medium text-[var(--color-ink-muted)]">
              Curah hujan
            </dt>
            <dd className="tabular-nums mt-1 text-lg font-bold text-[var(--color-ink)]">
              {current.rainMm} mm
            </dd>
          </div>
          <div className="rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] p-3">
            <dt className="text-xs font-medium text-[var(--color-ink-muted)]">
              Jarak pandang
            </dt>
            <dd className="tabular-nums mt-1 text-lg font-bold text-[var(--color-ink)]">
              {current.visibilityText ?? "–"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Quick switcher for kelurahan/desa inside the selected kecamatan */}
      <div className="mt-5 border-t border-[var(--color-border-subtle)] pt-4">
        <p className="text-xs font-semibold text-[var(--color-ink-muted)]">
          Kelurahan/desa di Kec. {region.kecamatan} ({siblingDesas.length})
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {siblingDesas.slice(0, 8).map((desa) => {
            const active = desa.adm4 === region.adm4;
            return (
              <Link
                key={desa.adm4}
                href={`/wilayah/${adm4ToSlug(desa.adm4)}`}
                scroll={false}
                className={`inline-flex min-h-10 items-center rounded-[var(--radius-control)] px-2.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                    : "border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] text-[var(--color-ink)] hover:border-[var(--color-border)]"
                }`}
              >
                {desa.desa}
              </Link>
            );
          })}
        </div>
        {forecast.isFixtureSample && (
          <p className="mt-3 text-[11px] text-[var(--color-ink-muted)]">
            {forecast.sourceLabel}
          </p>
        )}
      </div>
    </Card>
  );
}
