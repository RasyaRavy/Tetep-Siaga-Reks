"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { buildLocalAdvice, computeDryWindow } from "@/lib/advice";
import { getRegionsInKecamatan } from "@/lib/regions";
import type {
  ElevationTier,
  Forecast,
  ForecastSlot,
  Region,
  SkyToken,
} from "@/types";

interface RegionDrawerProps {
  region: Region;
  forecast: Forecast | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  sky: SkyToken;
  open: boolean;
  onClose: () => void;
  onSelectAdm4: (adm4: string) => void;
}

const ELEVATION_LABELS: Record<ElevationTier, string> = {
  "dataran-tinggi": "Dataran Tinggi",
  "dataran-sedang": "Lembah & Kota",
  pesisir: "Pesisir Selatan",
};

function AreaTempChart({ slots }: { slots: ForecastSlot[] }) {
  const sample = slots.slice(0, 8);
  if (sample.length < 2) return null;

  const temps = sample.map((s) => s.tempC);
  const minT = Math.min(...temps) - 2;
  const maxT = Math.max(...temps) + 2;
  const range = Math.max(1, maxT - minT);

  const width = 368;
  const height = 148;
  const padX = 24;
  const padTop = 26;
  const padBottom = 30;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const baselineY = height - padBottom;

  const points = sample.map((slot, idx) => {
    const x = padX + (idx / (sample.length - 1)) * innerW;
    const y = padTop + ((maxT - slot.tempC) / range) * innerH;
    return { x, y, slot };
  });

  const linePath = points
    .map((p, idx) => {
      if (idx === 0) return `M ${p.x} ${p.y}`;
      const prev = points[idx - 1];
      if (!prev) return `L ${p.x} ${p.y}`;
      const cx = (prev.x + p.x) / 2;
      return `C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
    })
    .join(" ");

  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  const areaPath =
    firstPt && lastPt
      ? `${linePath} L ${lastPt.x} ${baselineY} L ${firstPt.x} ${baselineY} Z`
      : "";

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-gradient-to-b from-white to-[#f4f8fb] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-extrabold text-[var(--color-ink)]">
          Kurva suhu &amp; curah hujan per 3 jam (WIB)
        </h3>
        <span className="tabular-nums text-[11px] font-bold text-[var(--color-accent)]">
          {Math.min(...temps)}° - {Math.max(...temps)}°C
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-2 h-auto w-full"
        role="img"
        aria-label="Grafik kurva perubahan suhu dan curah hujan per 3 jam"
      >
        <title>Grafik kurva perubahan suhu dan curah hujan</title>
        <defs>
          <linearGradient id="tempAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b5394" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#0b5394" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {points.map((p) => {
          const barH = Math.min(26, p.slot.rainMm * 6);
          if (barH <= 0) return null;
          return (
            <rect
              key={`rain-${p.slot.utcDatetime}`}
              x={p.x - 6}
              y={baselineY - barH}
              width="12"
              height={barH}
              rx="3"
              fill="#38bdf8"
              opacity="0.45"
            />
          );
        })}

        <line
          x1={padX}
          y1={baselineY}
          x2={width - padX}
          y2={baselineY}
          stroke="var(--color-border-subtle)"
          strokeWidth="1"
        />

        {areaPath && <path d={areaPath} fill="url(#tempAreaGrad)" />}

        <path
          d={linePath}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {points.map((p) => (
          <g key={p.slot.utcDatetime}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#ffffff"
              stroke="var(--color-accent)"
              strokeWidth="2.4"
            />
            <text
              x={p.x}
              y={p.y - 9}
              textAnchor="middle"
              fill="var(--color-ink)"
              fontSize="11"
              fontWeight="800"
            >
              {p.slot.tempC}°
            </text>
            <text
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              fill="var(--color-ink-muted)"
              fontSize="10"
              fontWeight="600"
            >
              {p.slot.wibTime}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function RegionDrawer({
  region,
  forecast,
  isLoading,
  errorMessage,
  onRetry,
  sky,
  open,
  onClose,
  onSelectAdm4,
}: RegionDrawerProps) {
  if (!open) return null;

  const siblingDesas = getRegionsInKecamatan(region.adm3);
  const heroGradientVar = `var(--hero-${sky.period}-${sky.condition})`;

  const current = forecast?.current ?? null;
  const days = forecast?.days ?? [];
  const todaySlots = days[0]?.slots ?? [];
  const combinedSlots = days.flatMap((d) => d.slots);
  const dryWindow = current ? computeDryWindow(todaySlots) : null;
  const localAdvice = current
    ? buildLocalAdvice(current, region.elevationTier, region.kecamatan)
    : null;

  return (
    <aside
      aria-label={`Detail cuaca ${region.desa}, Kecamatan ${region.kecamatan}`}
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[82dvh] flex-col overflow-hidden rounded-t-[22px] border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-ink)] shadow-2xl md:top-[134px] md:right-4 md:bottom-4 md:left-auto md:max-h-none md:w-[400px] md:rounded-[var(--radius-map)] md:border lg:top-4 lg:w-[436px]"
    >
      {/* Rich Atmospheric Sky Hero Banner (WCAG AAA >= 7.6:1 white text contrast; shrink-0 prevents vertical flex clipping on mobile) */}
      <div
        style={{ background: heroGradientVar }}
        className="relative shrink-0 overflow-hidden px-4 pt-3.5 pb-4 text-white sm:px-5 sm:pt-4 sm:pb-5"
      >
        <svg
          viewBox="0 0 440 90"
          fill="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full opacity-20"
        >
          <path
            d="M0 90L68 48L124 68L208 18L286 58L356 30L440 66V90H0Z"
            fill="#ffffff"
          />
        </svg>

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white">
                {region.kotkab}
              </span>
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white">
                {ELEVATION_LABELS[region.elevationTier]}
              </span>
            </div>
            <h1 className="title-region mt-1.5 truncate font-extrabold text-white">
              {region.desa}
            </h1>
            <p className="text-xs font-medium text-[#E2F1FF]">
              Kecamatan {region.kecamatan}
              {forecast ? ` · Pembaruan ${forecast.updatedAtWib}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel dan kembali ke peta Malang Raya"
            title="Tutup panel dan kembali ke tampilan penuh Malang Raya"
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] border border-white/35 bg-white/15 px-3 text-xs font-extrabold text-white transition-colors hover:bg-white/25"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <span>Tutup</span>
          </button>
        </div>

        {current ? (
          <div className="relative mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="temp-hero tabular-nums font-extrabold text-white">
                {current.tempC}°
              </p>
              <p className="mt-1 text-base font-bold text-white">
                {current.weatherDesc}
              </p>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/18 p-2.5 shadow-sm">
              <WeatherIcon
                code={current.weatherCode}
                size={60}
                variant="hero"
              />
            </div>
          </div>
        ) : isLoading ? (
          <div className="relative mt-4 flex items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="h-12 w-28 animate-pulse rounded-lg bg-white/25" />
              <p className="text-xs font-bold text-[#E2F1FF]">
                Mengambil prakiraan resmi BMKG...
              </p>
            </div>
            <div className="h-16 w-16 animate-pulse rounded-2xl bg-white/20" />
          </div>
        ) : (
          <div className="relative mt-4">
            <p className="text-sm font-bold text-[#E2F1FF]">
              Data cuaca wilayah ini belum tersedia saat ini
            </p>
          </div>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {/* Loading State (when no cached forecast yet) */}
        {isLoading && !forecast && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton
              label={`Memuat prakiraan cuaca BMKG untuk ${region.desa}`}
              className="h-14 w-full"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <Skeleton label="Memuat kelembapan" className="h-24 w-full" />
              <Skeleton
                label="Memuat kecepatan angin"
                className="h-24 w-full"
              />
              <Skeleton label="Memuat curah hujan" className="h-24 w-full" />
              <Skeleton label="Memuat jarak pandang" className="h-24 w-full" />
            </div>
            <Skeleton
              label="Memuat grafik suhu 3 jam"
              className="h-36 w-full"
            />
          </div>
        )}

        {/* Error State (when BMKG unreachable and no cached forecast) */}
        {!isLoading && errorMessage && !forecast && (
          <div
            role="alert"
            className="rounded-[var(--radius-card)] border-2 border-[#b45309]/35 bg-[var(--color-warn-bg)] p-4 text-[var(--color-warn-ink)]"
          >
            <p className="text-sm font-extrabold">
              Prakiraan cuaca BMKG belum dapat dimuat
            </p>
            <p className="mt-1 text-xs leading-relaxed">{errorMessage}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              <span>Muat ulang prakiraan</span>
            </button>
          </div>
        )}

        {/* Stale Data Banner (when serving cached BMKG forecast because live refresh failed) */}
        {forecast?.isStale && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-[#b45309]/35 bg-[var(--color-warn-bg)] px-3.5 py-2.5 text-xs text-[var(--color-warn-ink)]"
          >
            <span className="font-semibold">
              Menampilkan data terakhir pukul {forecast.updatedAtWib} karena
              server BMKG sedang lambat.
            </span>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-[#78350f]/30 bg-white/80 px-2.5 text-[11px] font-extrabold text-[var(--color-warn-ink)] hover:bg-white"
            >
              Perbarui
            </button>
          </div>
        )}

        {/* Live / Cached Forecast Content */}
        {forecast && current && dryWindow && localAdvice && (
          <>
            {/* R6: Height-aware local advice */}
            <p className="text-sm font-medium leading-relaxed text-[var(--color-ink)]">
              {localAdvice}
            </p>

            {/* R2: Dry window highlight card */}
            <div
              className={`rounded-[var(--radius-card)] border px-4 py-3 ${
                dryWindow.hasDryWindow
                  ? "border-[var(--color-safe-ink)]/25 bg-[var(--color-safe-bg)] text-[var(--color-safe-ink)]"
                  : "border-[var(--color-warn-ink)]/25 bg-[var(--color-warn-bg)] text-[var(--color-warn-ink)]"
              }`}
            >
              <p className="text-sm font-extrabold">{dryWindow.label}</p>
              <p className="mt-0.5 text-xs font-medium opacity-90">
                {dryWindow.detail}
              </p>
            </div>

            {/* 4 Tactile Weather Metrics */}
            <dl className="grid grid-cols-2 gap-2.5">
              <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-3.5">
                <dt className="text-xs font-semibold text-[var(--color-ink-muted)]">
                  Kelembapan Udara
                </dt>
                <dd className="tabular-nums mt-1 text-xl font-extrabold text-[var(--color-ink)]">
                  {current.humidityPct}%
                </dd>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white">
                  <div
                    style={{ width: `${Math.min(100, current.humidityPct)}%` }}
                    className="h-full rounded-full bg-[var(--color-accent)]"
                  />
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-3.5">
                <dt className="text-xs font-semibold text-[var(--color-ink-muted)]">
                  Angin ({current.windDir})
                </dt>
                <dd className="mt-1 flex items-center justify-between gap-2">
                  <span className="tabular-nums text-xl font-extrabold text-[var(--color-ink)]">
                    {current.windSpeedKmh}
                    <span className="ml-1 text-xs font-semibold text-[var(--color-ink-muted)]">
                      km/j
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    title={`Arah angin ${current.windDeg} derajat`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-white"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      style={{ transform: `rotate(${current.windDeg}deg)` }}
                    >
                      <path
                        d="M12 3L18 19L12 15.5L6 19L12 3Z"
                        fill="var(--color-accent)"
                      />
                    </svg>
                  </span>
                </dd>
              </div>

              <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-3.5">
                <dt className="text-xs font-semibold text-[var(--color-ink-muted)]">
                  Curah Hujan
                </dt>
                <dd className="tabular-nums mt-1 text-xl font-extrabold text-[var(--color-ink)]">
                  {current.rainMm}{" "}
                  <span className="text-xs font-semibold text-[var(--color-ink-muted)]">
                    mm
                  </span>
                </dd>
                <p className="mt-1 text-[11px] font-medium text-[var(--color-ink-muted)]">
                  {current.rainMm === 0
                    ? "Tidak ada hujan"
                    : current.rainMm < 5
                      ? "Intensitas ringan"
                      : "Intensitas sedang-lebat"}
                </p>
              </div>

              <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-3.5">
                <dt className="text-xs font-semibold text-[var(--color-ink-muted)]">
                  Jarak Pandang
                </dt>
                <dd className="tabular-nums mt-1 text-xl font-extrabold text-[var(--color-ink)]">
                  {current.visibilityText ?? "–"}
                </dd>
                <p className="mt-1 text-[11px] font-medium text-[var(--color-ink-muted)]">
                  Tutupan awan {current.cloudCoverPct}%
                </p>
              </div>
            </dl>

            {/* Smooth Bezier Area Temperature & Rain Chart */}
            <AreaTempChart slots={combinedSlots} />

            {/* 3-hour forecast strip */}
            <div>
              <h2 className="text-xs font-extrabold text-[var(--color-ink)]">
                Jadwal cuaca per 3 jam (WIB)
              </h2>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1.5">
                {combinedSlots.slice(0, 10).map((slot) => (
                  <div
                    key={slot.utcDatetime}
                    className="flex min-w-[82px] shrink-0 flex-col items-center rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-2.5 py-2.5 text-center"
                  >
                    <span className="tabular-nums text-[11px] font-bold text-[var(--color-ink-muted)]">
                      {slot.wibTime}
                    </span>
                    <WeatherIcon
                      code={slot.weatherCode}
                      size={28}
                      className="my-1.5"
                    />
                    <span className="tabular-nums text-sm font-extrabold text-[var(--color-ink)]">
                      {slot.tempC}°
                    </span>
                    <span className="tabular-nums mt-0.5 text-[10px] font-bold text-[var(--color-accent)]">
                      {slot.rainMm} mm
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3-day summary */}
            <div>
              <h2 className="text-xs font-extrabold text-[var(--color-ink)]">
                Prakiraan 3 hari ke depan
              </h2>
              <div className="mt-2 divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white px-3.5">
                {days.map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between gap-2 py-3 text-xs"
                  >
                    <div className="min-w-[92px]">
                      <p className="font-extrabold text-[var(--color-ink)]">
                        {day.dayLabel}
                      </p>
                      <p className="tabular-nums text-[11px] text-[var(--color-ink-muted)]">
                        Total hujan {day.totalRainMm} mm
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <WeatherIcon code={day.dominantWeatherCode} size={24} />
                      <span className="font-semibold text-[var(--color-ink-muted)]">
                        {day.dominantWeatherDesc}
                      </span>
                    </div>
                    <span className="tabular-nums font-extrabold text-[var(--color-ink)]">
                      {day.minTempC}° / {day.maxTempC}°
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Kelurahan switcher (always available so user can switch within kecamatan anytime) */}
        <div>
          <p className="text-xs font-extrabold text-[var(--color-ink)]">
            Kelurahan/desa lain di Kec. {region.kecamatan} (
            {siblingDesas.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {siblingDesas.map((desa) => {
              const active = desa.adm4 === region.adm4;
              return (
                <button
                  key={desa.adm4}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectAdm4(desa.adm4)}
                  className={`inline-flex min-h-10 items-center rounded-[var(--radius-control)] px-2.5 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                      : "border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] text-[var(--color-ink)] hover:border-[var(--color-border)]"
                  }`}
                >
                  {desa.desa}
                </button>
              );
            })}
          </div>
        </div>

        {/* Attribution */}
        <div className="border-t border-[var(--color-border-subtle)] pt-3 text-[11px] text-[var(--color-ink-muted)]">
          <p className="font-bold text-[var(--color-ink)]">
            Sumber data resmi: BMKG
          </p>
          <p className="mt-0.5">
            {forecast
              ? forecast.sourceLabel
              : "Prakiraan cuaca tingkat desa/kelurahan dari Badan Meteorologi, Klimatologi, dan Geofisika."}
          </p>
        </div>
      </div>
    </aside>
  );
}
