"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDistanceKm, haversineKm } from "@/lib/geo";
import type { Quake, QuakeBundle, Region } from "@/types";

const LazyQuakeMap = dynamic(
  () => import("./QuakeMap").then((m) => m.QuakeMap),
  {
    ssr: false,
    loading: () => (
      <Skeleton
        label="Memuat peta episenter gempa Indonesia..."
        className="h-52 w-full"
      />
    ),
  },
);

interface QuakeDrawerProps {
  open: boolean;
  onClose: () => void;
  quakes: QuakeBundle;
  isRefreshing: boolean;
  refreshError: string | null;
  refreshSuccessMsg?: string | null;
  onRefresh: () => void;
  region: Region;
}

type QuakeTab = "terbaru" | "m5" | "dirasakan";

function getMagnitudeVariant(mag: number): "bahaya" | "waspada" | "aman" {
  if (mag >= 6) return "bahaya";
  if (mag >= 5) return "waspada";
  return "aman";
}

export function QuakeDrawer({
  open,
  onClose,
  quakes,
  isRefreshing,
  refreshError,
  refreshSuccessMsg = null,
  onRefresh,
  region,
}: QuakeDrawerProps) {
  const [activeTab, setActiveTab] = useState<QuakeTab>("terbaru");
  const [selectedQuakeId, setSelectedQuakeId] = useState<string>(
    quakes.latest.id,
  );
  const [showShakemap, setShowShakemap] = useState(false);
  const [shakemapError, setShakemapError] = useState(false);

  // Reset to latest quake when drawer re-opens or feed updates
  useEffect(() => {
    if (open) {
      setSelectedQuakeId(quakes.latest.id);
      setShowShakemap(false);
      setShakemapError(false);
    }
  }, [open, quakes.latest.id]);

  const allQuakes = useMemo(() => {
    const map = new Map<string, Quake>();
    map.set(quakes.latest.id, quakes.latest);
    for (const q of quakes.recentM5) {
      if (!map.has(q.id)) map.set(q.id, q);
    }
    for (const q of quakes.felt) {
      if (!map.has(q.id)) map.set(q.id, q);
    }
    return Array.from(map.values());
  }, [quakes.felt, quakes.latest, quakes.recentM5]);

  if (!open) return null;

  const selectedQuake =
    allQuakes.find((q) => q.id === selectedQuakeId) ?? quakes.latest;

  const distanceKm = haversineKm(
    { lat: region.lat, lng: region.lng },
    { lat: selectedQuake.lat, lng: selectedQuake.lng },
  );

  const listItems =
    activeTab === "m5"
      ? quakes.recentM5
      : activeTab === "dirasakan"
        ? quakes.felt
        : [
            quakes.latest,
            ...quakes.recentM5
              .filter((q) => q.dateTimeIso !== quakes.latest.dateTimeIso)
              .slice(0, 5),
          ];

  return (
    <aside
      aria-label="Informasi Gempa Bumi BMKG"
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[82dvh] flex-col overflow-hidden rounded-t-[20px] border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-ink)] shadow-2xl md:top-[134px] md:right-4 md:bottom-4 md:left-auto md:max-h-none md:w-[400px] md:rounded-[var(--radius-map)] md:border lg:top-4 lg:w-[436px]"
    >
      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--color-border-subtle)] px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--color-accent)]">
            TEWS Resmi BMKG
          </p>
          <h2 className="title-section mt-0.5 font-extrabold text-[var(--color-ink)]">
            Info Gempa Bumi Terkini
          </h2>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled={isRefreshing}
            onClick={onRefresh}
            aria-label="Muat ulang data gempa dari BMKG"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-2.5 text-xs font-bold text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-60"
          >
            <span>{isRefreshing ? "Memuat..." : "Perbarui"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel gempa"
            className="inline-flex min-h-10 items-center gap-1 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3 text-xs font-extrabold text-[var(--color-ink)] hover:border-[var(--color-border)]"
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
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
            <span>Tutup</span>
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {/* Refresh Confirmation / Error / Stale Notice */}
        {refreshSuccessMsg && !refreshError && (
          <div
            role="status"
            className="rounded-[var(--radius-control)] border border-[var(--color-safe-ink)]/25 bg-[var(--color-safe-bg)] px-3 py-2 text-xs font-bold text-[var(--color-safe-ink)]"
          >
            {refreshSuccessMsg}
          </div>
        )}
        {(refreshError || quakes.isStale) && (
          <div
            role="status"
            className="rounded-[var(--radius-control)] border border-[#b45309]/35 bg-[var(--color-warn-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-warn-ink)]"
          >
            {refreshError ??
              `Menampilkan data gempa terakhir pukul ${quakes.updatedAtWib}.`}
          </div>
        )}

        {/* Selected Quake Detail Card */}
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant={getMagnitudeVariant(selectedQuake.magnitude)}>
              Magnitudo {selectedQuake.magnitude.toFixed(1)}
            </Badge>
            <span className="tabular-nums text-xs font-bold text-[var(--color-ink-muted)]">
              Kedalaman {selectedQuake.depthKm} km
            </span>
          </div>

          <p className="mt-2.5 text-sm font-extrabold leading-snug text-[var(--color-ink)]">
            {selectedQuake.regionDesc}
          </p>

          <p className="tabular-nums mt-1 text-xs font-semibold text-[var(--color-ink-muted)]">
            {selectedQuake.wibLabel}
          </p>

          <p className="tabular-nums mt-1.5 text-xs font-extrabold text-[var(--color-accent)]">
            Jarak {formatDistanceKm(distanceKm)} dari Kec. {region.kecamatan} (
            {selectedQuake.lat.toFixed(2)}, {selectedQuake.lng.toFixed(2)})
          </p>

          {selectedQuake.potential && (
            <p className="mt-2.5 rounded-[var(--radius-control)] bg-white px-3 py-2 text-xs font-bold text-[var(--color-ink)]">
              {selectedQuake.potential}
            </p>
          )}

          {selectedQuake.feltMmi && (
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-muted)]">
              <span className="font-bold text-[var(--color-ink)]">
                Dirasakan (MMI):{" "}
              </span>
              {selectedQuake.feltMmi}
            </p>
          )}

          {/* Lazy Shakemap Viewer (only downloads ~220 KB JPEG when user clicks) */}
          {selectedQuake.shakemapUrl && (
            <div className="mt-3 border-t border-[var(--color-border-subtle)] pt-3">
              <button
                type="button"
                aria-expanded={showShakemap}
                onClick={() => {
                  setShowShakemap((v) => !v);
                  setShakemapError(false);
                }}
                className="inline-flex min-h-10 w-full items-center justify-between rounded-[var(--radius-control)] border border-[var(--color-border)] bg-white px-3 text-xs font-extrabold text-[var(--color-accent)] transition-colors hover:border-[var(--color-accent)]"
              >
                <span>
                  {showShakemap
                    ? "Sembunyikan Peta Guncangan (Shakemap)"
                    : "Lihat Peta Guncangan (Shakemap BMKG)"}
                </span>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className={`transition-transform ${showShakemap ? "rotate-180" : ""}`}
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {showShakemap && (
                <div className="mt-2 overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-white">
                  {shakemapError ? (
                    <p className="p-3 text-xs text-[var(--color-ink-muted)]">
                      Gambar peta guncangan (Shakemap) belum dapat dimuat dari
                      server BMKG saat ini.
                    </p>
                  ) : (
                    // biome-ignore lint/performance/noImgElement: On-demand proxied BMKG Shakemap JPEG
                    <img
                      src={selectedQuake.shakemapUrl}
                      alt={`Peta guncangan BMKG untuk gempa ${selectedQuake.regionDesc}`}
                      decoding="async"
                      onError={() => setShakemapError(true)}
                      className="min-h-[180px] w-full bg-[var(--color-surface-subtle)] object-contain"
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lazy-loaded MapLibre Epicenter Map */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <h3 className="text-xs font-extrabold text-[var(--color-ink)]">
              Peta Episenter &amp; Jarak ke Malang Raya
            </h3>
            <span className="text-[11px] font-semibold text-[var(--color-ink-muted)]">
              Pilih daftar di bawah untuk geser peta
            </span>
          </div>
          <LazyQuakeMap
            selectedQuake={selectedQuake}
            allQuakes={allQuakes}
            region={region}
          />
        </div>

        {/* Interactive Feed Tabs */}
        <div>
          <div
            role="tablist"
            aria-label="Kategori umpan gempa BMKG"
            className="grid grid-cols-3 gap-1 rounded-[var(--radius-control)] bg-[var(--color-surface-subtle)] p-1"
          >
            {(
              [
                { id: "terbaru", label: "Terbaru" },
                { id: "m5", label: `M 5+ (${quakes.recentM5.length})` },
                { id: "dirasakan", label: `Dirasakan (${quakes.felt.length})` },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-10 rounded-[var(--radius-control)] px-2 text-xs font-extrabold transition-colors ${
                    active
                      ? "bg-white text-[var(--color-accent)] shadow-sm"
                      : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <ul className="mt-2.5 space-y-2">
            {listItems.map((q) => {
              const isSelected = q.id === selectedQuake.id;
              const qDist = haversineKm(
                { lat: region.lat, lng: region.lng },
                { lat: q.lat, lng: q.lng },
              );
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedQuakeId(q.id);
                      setShowShakemap(false);
                      setShakemapError(false);
                    }}
                    className={`w-full rounded-[var(--radius-control)] border px-3 py-2.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "border-[var(--color-accent)] bg-[#eef6fc]"
                        : "border-[var(--color-border-subtle)] bg-white hover:border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="tabular-nums font-extrabold text-[var(--color-ink)]">
                        M {q.magnitude.toFixed(1)} · Kedalaman {q.depthKm} km
                      </span>
                      <span className="tabular-nums shrink-0 font-bold text-[var(--color-accent)]">
                        {formatDistanceKm(qDist)}
                      </span>
                    </div>
                    <p className="mt-1 font-semibold text-[var(--color-ink)]">
                      {q.regionDesc}
                    </p>
                    <p className="tabular-nums mt-0.5 text-[11px] text-[var(--color-ink-muted)]">
                      {q.wibLabel}
                      {q.feltMmi ? ` · ${q.feltMmi}` : ""}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Attribution Footer */}
        <div className="border-t border-[var(--color-border-subtle)] pt-3 text-[11px] text-[var(--color-ink-muted)]">
          <p className="font-bold text-[var(--color-ink)]">
            Sumber data resmi: BMKG TEWS
          </p>
          <p className="mt-0.5">{quakes.sourceLabel}</p>
        </div>
      </div>
    </aside>
  );
}
