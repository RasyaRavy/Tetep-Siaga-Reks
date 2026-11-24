"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { LocationCombobox } from "@/components/ui/LocationCombobox";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useOnline } from "@/hooks/useOnline";
import { useSavedLocation } from "@/hooks/useSavedLocation";
import { formatCapDescription } from "@/lib/format-alert";
import {
  loadLocalForecast,
  saveLocalForecast,
} from "@/lib/local-forecast-cache";
import {
  adm4ToSlug,
  getDefaultRegion,
  getKecamatanByAdm3,
  getRegionByAdm4,
  KECAMATAN_MAP,
  slugToAdm4,
} from "@/lib/regions";
import { resolveSkyPreset, resolveSkyToken } from "@/lib/sky";
import type {
  AlertBundle,
  Forecast,
  KecamatanShape,
  KecamatanWeatherSummary,
  QuakeBundle,
  Region,
} from "@/types";
import { QuakeDrawer } from "./QuakeDrawer";
import { RealisticMalangMap } from "./RealisticMalangMap";
import { RegionDrawer } from "./RegionDrawer";
import { WeatherAtmosphere } from "./WeatherAtmosphere";

interface MapWorkspaceProps {
  summaries: KecamatanWeatherSummary[];
  initialDefaultForecast: Forecast;
  summariesFromFallback?: boolean;
  quakes: QuakeBundle;
  alertBundle: AlertBundle;
}

interface ClientCachedForecast {
  forecast: Forecast;
  fetchedAtMs: number;
}

const CLIENT_FORECAST_TTL_MS = 30 * 60 * 1000;

const TEMP_LEGEND = [
  { label: "< 20°", color: "var(--color-temp-cool)" },
  { label: "20-23°", color: "var(--color-temp-fresh)" },
  { label: "24-27°", color: "var(--color-temp-mild)" },
  { label: "28-30°", color: "var(--color-temp-warm)" },
  { label: ">= 31°", color: "var(--color-temp-hot)" },
];

const FEATURED_ADM3 = [
  "35.79.01", // Batu
  "35.73.02", // Klojen
  "35.73.05", // Lowokwaru
  "35.07.26", // Pujon
  "35.07.13", // Kepanjen
];

const SKY_MODES = [
  { id: "auto", label: "Ikuti Cuaca BMKG" },
  { id: "pagi-cerah", label: "Pagi Cerah" },
  { id: "siang-berawan", label: "Siang Berawan" },
  { id: "siang-hujan", label: "Siang Hujan" },
  { id: "siang-badai", label: "Badai Petir" },
  { id: "senja-cerah", label: "Senja" },
];

function parsePathAdm4(pathname: string): string | null {
  const match = pathname.match(/^\/wilayah\/([^/?#]+)/);
  if (match?.[1]) {
    const found = getRegionByAdm4(slugToAdm4(match[1]));
    if (found) {
      return found.adm4;
    }
  }
  return null;
}

export function MapWorkspace({
  summaries,
  initialDefaultForecast,
  summariesFromFallback = false,
  quakes,
  alertBundle,
}: MapWorkspaceProps) {
  const pathname = usePathname();
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const skyPanelRef = useRef<HTMLDivElement>(null);

  const isOnline = useOnline();
  const [liveSummaries, setLiveSummaries] =
    useState<KecamatanWeatherSummary[]>(summaries);
  const [liveQuakes, setLiveQuakes] = useState<QuakeBundle>(quakes);
  const [liveAlerts, setLiveAlerts] = useState<AlertBundle>(alertBundle);
  const [isRefreshingAlerts, setIsRefreshingAlerts] = useState(false);
  const [alertRefreshError, setAlertRefreshError] = useState<string | null>(
    null,
  );
  const [alertRefreshSuccess, setAlertRefreshSuccess] = useState<string | null>(
    null,
  );
  const [isRefreshingQuakes, setIsRefreshingQuakes] = useState(false);
  const [quakeRefreshError, setQuakeRefreshError] = useState<string | null>(
    null,
  );
  const [quakeRefreshSuccess, setQuakeRefreshSuccess] = useState<string | null>(
    null,
  );

  // Client-side forecast cache seeded with SSR initialDefaultForecast
  const forecastCacheRef = useRef<Map<string, ClientCachedForecast>>(
    new Map([
      [
        initialDefaultForecast.region.adm4,
        { forecast: initialDefaultForecast, fetchedAtMs: Date.now() },
      ],
    ]),
  );

  // Single Source of Truth: `activeAdm4 === null` means `/` overview (panel closed);
  // `activeAdm4 !== null` means `/wilayah/[adm4]` (panel open & map zoomed to that region)
  const [activeAdm4, setActiveAdm4] = useState<string | null>(() =>
    parsePathAdm4(pathname),
  );
  const [activeForecast, setActiveForecast] = useState<Forecast | null>(() => {
    const initialAdm4 = parsePathAdm4(pathname);
    if (initialAdm4 && initialAdm4 === initialDefaultForecast.region.adm4) {
      return initialDefaultForecast;
    }
    return null;
  });
  const [isLoadingForecast, setIsLoadingForecast] = useState<boolean>(() => {
    const initialAdm4 = parsePathAdm4(pathname);
    return Boolean(
      initialAdm4 && initialAdm4 !== initialDefaultForecast.region.adm4,
    );
  });
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const [quakeDrawerOpen, setQuakeDrawerOpen] = useState(false);
  const [alertPopoverOpen, setAlertPopoverOpen] = useState(false);
  const [moreZonesOpen, setMoreZonesOpen] = useState(false);
  const [skySimOpen, setSkySimOpen] = useState(false);
  const [legendExpandedMobile, setLegendExpandedMobile] = useState(false);
  const [skyOverride, setSkyOverride] = useState<string>("auto");
  const [motionPaused, setMotionPaused] = useState(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);

  const { savedRegion, saveAdm4 } = useSavedLocation();
  const {
    status: geoStatus,
    errorMessage: geoError,
    locateNearestRegion,
    clearError: clearGeoError,
  } = useGeolocation();

  // Sync if user arrives via Next.js Link (e.g., from /tentang)
  useEffect(() => {
    setActiveAdm4(parsePathAdm4(pathname));
  }, [pathname]);

  // Sync on browser Back / Forward (popstate)
  useEffect(() => {
    function onPopState() {
      setActiveAdm4(parsePathAdm4(window.location.pathname));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleRefreshQuakes = useCallback(async () => {
    setIsRefreshingQuakes(true);
    setQuakeRefreshError(null);
    setQuakeRefreshSuccess(null);
    try {
      const res = await fetch("/api/gempa?refresh=1", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as
        | (QuakeBundle & { message?: string })
        | null;
      if (!res.ok || !payload?.latest) {
        throw new Error(
          payload?.message ??
            "Server info gempa BMKG TEWS sedang tidak merespons.",
        );
      }
      setLiveQuakes(payload);
      setQuakeRefreshSuccess(
        `Data gempa berhasil diperbarui dari BMKG TEWS pukul ${payload.updatedAtWib}.`,
      );
    } catch (err) {
      setQuakeRefreshError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui data gempa BMKG TEWS.",
      );
    } finally {
      setIsRefreshingQuakes(false);
    }
  }, []);

  // Auto-refresh `/api/gempa` on mount if SSR fell back to local fixture
  useEffect(() => {
    if (!quakes.isFixtureSample) return;
    handleRefreshQuakes();
  }, [quakes.isFixtureSample, handleRefreshQuakes]);

  // If SSR cold-start fell back to Stage 1 summaries, refresh `/api/cuaca/ringkasan` on client mount
  useEffect(() => {
    if (!summariesFromFallback) return;
    const controller = new AbortController();
    fetch("/api/cuaca/ringkasan", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          summaries?: KecamatanWeatherSummary[];
        };
        if (Array.isArray(data.summaries) && data.summaries.length > 0) {
          setLiveSummaries(data.summaries);
        }
      })
      .catch(() => {
        // Keep fallback summaries silently if offline
      });
    return () => controller.abort();
  }, [summariesFromFallback]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMoreZonesOpen(false);
      }
      if (skyPanelRef.current && !skyPanelRef.current.contains(target)) {
        setSkySimOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const defaultRegion = useMemo(() => getDefaultRegion(), []);

  const selectedRegion: Region | null = useMemo(
    () => (activeAdm4 ? (getRegionByAdm4(activeAdm4) ?? null) : null),
    [activeAdm4],
  );

  // Fetch live BMKG forecast whenever `activeAdm4` changes (or `reloadNonce` increments)
  useEffect(() => {
    if (!activeAdm4) {
      setActiveForecast(null);
      setIsLoadingForecast(false);
      setForecastError(null);
      return;
    }

    saveAdm4(activeAdm4);

    const cached = forecastCacheRef.current.get(activeAdm4);
    const isFresh =
      cached &&
      Date.now() - cached.fetchedAtMs < CLIENT_FORECAST_TTL_MS &&
      !cached.forecast.isStale &&
      reloadNonce === 0;

    if (isFresh && cached) {
      setActiveForecast(cached.forecast);
      setIsLoadingForecast(false);
      setForecastError(null);
      return;
    }

    // Show cached immediately if revalidating, else show skeleton
    if (cached && reloadNonce === 0) {
      setActiveForecast(cached.forecast);
    } else if (cached?.forecast.region.adm4 !== activeAdm4) {
      setActiveForecast(null);
    }

    setIsLoadingForecast(true);
    setForecastError(null);

    const controller = new AbortController();

    fetch(`/api/cuaca/${encodeURIComponent(activeAdm4)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const payload = (await res.json().catch(() => null)) as {
          forecast?: Forecast;
          message?: string;
        } | null;

        if (!res.ok || !payload?.forecast) {
          throw new Error(
            payload?.message ??
              "Server prakiraan cuaca BMKG sedang tidak merespons. Silakan coba muat ulang beberapa saat lagi.",
          );
        }

        const freshForecast = payload.forecast;
        saveLocalForecast(freshForecast);
        forecastCacheRef.current.set(activeAdm4, {
          forecast: freshForecast,
          fetchedAtMs: Date.now(),
        });
        setActiveForecast(freshForecast);
        setForecastError(null);

        // Sync kecamatan choropleth summary if this is the kecamatan's representative village
        const parentKec = getKecamatanByAdm3(freshForecast.region.adm3);
        if (parentKec && parentKec.defaultAdm4 === activeAdm4) {
          setLiveSummaries((prev) => {
            const idx = prev.findIndex((s) => s.adm3 === parentKec.adm3);
            const updatedItem: KecamatanWeatherSummary = {
              adm3: parentKec.adm3,
              tempC: freshForecast.current.tempC,
              weatherCode: freshForecast.current.weatherCode,
              weatherDesc: freshForecast.current.weatherDesc,
              rainMm: freshForecast.current.rainMm,
            };
            if (idx === -1) return [...prev, updatedItem];
            const copy = [...prev];
            copy[idx] = updatedItem;
            return copy;
          });
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const offlineFallback = loadLocalForecast(activeAdm4);
        if (offlineFallback) {
          setActiveForecast(offlineFallback);
          setForecastError(null);
          return;
        }
        const msg =
          err instanceof Error
            ? err.message
            : "Gagal memuat prakiraan cuaca BMKG.";
        setForecastError(msg);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingForecast(false);
        }
      });

    return () => controller.abort();
  }, [activeAdm4, reloadNonce, saveAdm4]);

  const referenceRegion = selectedRegion ?? savedRegion ?? defaultRegion;

  const skyReferenceForecast = activeForecast ?? initialDefaultForecast;

  const naturalSky = useMemo(
    () =>
      resolveSkyToken(
        skyReferenceForecast.current.wibHour,
        skyReferenceForecast.current.weatherCode,
      ),
    [
      skyReferenceForecast.current.wibHour,
      skyReferenceForecast.current.weatherCode,
    ],
  );

  const activeSky =
    skyOverride === "auto"
      ? naturalSky
      : (resolveSkyPreset(skyOverride) ?? naturalSky);

  const quickZoneKecamatans = useMemo(() => {
    const base = FEATURED_ADM3.map((adm3) =>
      KECAMATAN_MAP.kecamatan.find((k) => k.adm3 === adm3),
    ).filter((k): k is KecamatanShape => Boolean(k));

    if (selectedRegion && !FEATURED_ADM3.includes(selectedRegion.adm3)) {
      const extra = KECAMATAN_MAP.kecamatan.find(
        (k) => k.adm3 === selectedRegion.adm3,
      );
      if (extra) {
        return [...base.slice(0, 4), extra];
      }
    }
    return base;
  }, [selectedRegion]);

  // Open a region -> updates state AND URL to `/wilayah/[adm4]`
  const navigateToAdm4 = useCallback(
    (adm4: string) => {
      const targetRegion = getRegionByAdm4(adm4);
      if (!targetRegion) return;

      clearGeoError();
      setAlertPopoverOpen(false);
      setMoreZonesOpen(false);
      setSkySimOpen(false);
      setQuakeDrawerOpen(false);
      setReloadNonce(0);
      setActiveAdm4(adm4);

      const nextUrl = `/wilayah/${adm4ToSlug(adm4)}`;
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== nextUrl
      ) {
        window.history.pushState(null, "", nextUrl);
        document.title = `Cuaca ${targetRegion.desa}, Kec. ${targetRegion.kecamatan} | Tetep Siaga Reks`;
      }
    },
    [clearGeoError],
  );

  const handleRefreshAlerts = useCallback(async () => {
    setIsRefreshingAlerts(true);
    setAlertRefreshError(null);
    setAlertRefreshSuccess(null);
    try {
      const res = await fetch("/api/peringatan?refresh=1", {
        cache: "no-store",
      });
      const payload = (await res.json().catch(() => null)) as
        | (AlertBundle & { message?: string })
        | null;
      if (!res.ok || !payload || !("checkedAtWib" in payload)) {
        throw new Error(
          payload?.message ??
            "Server peringatan dini BMKG sedang tidak merespons.",
        );
      }
      setLiveAlerts(payload);
      setAlertRefreshSuccess(
        `Status peringatan berhasil diperbarui dari BMKG pukul ${payload.checkedAtWib}.`,
      );
    } catch (err) {
      setAlertRefreshError(
        err instanceof Error
          ? err.message
          : "Gagal memperbarui status peringatan dini BMKG.",
      );
    } finally {
      setIsRefreshingAlerts(false);
    }
  }, []);

  const handleLocateMe = useCallback(() => {
    setGeoNotice(null);
    locateNearestRegion(({ region, distanceKm, accuracyMeters }) => {
      if (distanceKm > 75) {
        setGeoNotice(
          `Posisi Anda berjarak sekitar ${Math.round(distanceKm)} km dari Malang Raya. Menampilkan titik terdekat: ${region.desa}, Kec. ${region.kecamatan}.`,
        );
      } else if (accuracyMeters > 2000) {
        setGeoNotice(
          `Terdeteksi di ${region.desa}, Kec. ${region.kecamatan} (perkiraan jaringan ±${(accuracyMeters / 1000).toFixed(1)} km). Untuk akurasi terbaik, aktifkan GPS HP atau pilih kecamatan manual.`,
        );
      }
      navigateToAdm4(region.adm4);
    });
  }, [locateNearestRegion, navigateToAdm4]);

  const selectKecamatan = useCallback(
    (kec: KecamatanShape) => {
      const targetAdm4 =
        selectedRegion && kec.adm3 === selectedRegion.adm3
          ? selectedRegion.adm4
          : kec.defaultAdm4;
      navigateToAdm4(targetAdm4);
    },
    [navigateToAdm4, selectedRegion],
  );

  // Close panel -> resets state AND resets URL back to `/`
  const closeRegionAndResetUrl = useCallback(() => {
    setActiveAdm4(null);
    setQuakeDrawerOpen(false);
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.history.pushState(null, "", "/");
      document.title =
        "Tetep Siaga Reks | Peta Cuaca & Kesiapsiagaan Malang Raya";
    }
  }, []);

  const handleRetryForecast = useCallback(() => {
    if (!activeAdm4) return;
    forecastCacheRef.current.delete(activeAdm4);
    setReloadNonce((n) => n + 1);
  }, [activeAdm4]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (moreZonesOpen) {
          setMoreZonesOpen(false);
        } else if (skySimOpen) {
          setSkySimOpen(false);
        } else if (alertPopoverOpen) {
          setAlertPopoverOpen(false);
        } else if (quakeDrawerOpen) {
          setQuakeDrawerOpen(false);
        } else if (activeAdm4 !== null) {
          closeRegionAndResetUrl();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeAdm4,
    alertPopoverOpen,
    closeRegionAndResetUrl,
    moreZonesOpen,
    quakeDrawerOpen,
    skySimOpen,
  ]);

  // Quick overview card data on `/`: prefers user's `savedRegion` from localStorage if available
  const overviewQuickCard = useMemo(() => {
    const targetRegion = savedRegion ?? defaultRegion;
    const isSaved = Boolean(savedRegion);
    const cachedEntry = forecastCacheRef.current.get(targetRegion.adm4);
    if (cachedEntry) {
      return {
        region: targetRegion,
        isSaved,
        tempC: cachedEntry.forecast.current.tempC,
        weatherCode: cachedEntry.forecast.current.weatherCode,
        weatherDesc: cachedEntry.forecast.current.weatherDesc,
      };
    }
    const kecSummary = liveSummaries.find((s) => s.adm3 === targetRegion.adm3);
    if (kecSummary) {
      return {
        region: targetRegion,
        isSaved,
        tempC: kecSummary.tempC,
        weatherCode: kecSummary.weatherCode,
        weatherDesc: kecSummary.weatherDesc,
      };
    }
    return {
      region: defaultRegion,
      isSaved: false,
      tempC: initialDefaultForecast.current.tempC,
      weatherCode: initialDefaultForecast.current.weatherCode,
      weatherDesc: initialDefaultForecast.current.weatherDesc,
    };
  }, [defaultRegion, initialDefaultForecast, liveSummaries, savedRegion]);

  const regionDrawerOpen = selectedRegion !== null;
  const anyDrawerOpen = regionDrawerOpen || quakeDrawerOpen;

  return (
    <div
      className={`relative h-dvh w-full overflow-hidden bg-[#cae6f7] ${
        motionPaused ? "motion-paused" : ""
      }`}
    >
      {/* Living Sky Canopy & Weather Particles Layer */}
      <WeatherAtmosphere sky={activeSky} paused={motionPaused} />

      {/* Top Floating HUD (z-30 sits strictly above map controls z-20; Row 1 z-30 sits strictly above Row 2 z-10) */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="flex items-start justify-between gap-3">
          {/* Unified Left Column: Full comfortable width on mobile/tablet; only constrained beside drawer on lg+ */}
          <div
            className={`flex min-w-0 flex-1 flex-col gap-2 lg:w-fit lg:flex-initial ${
              anyDrawerOpen ? "lg:max-w-[calc(100vw-472px)]" : ""
            }`}
          >
            {/* Row 1: Brand + Grouped Search + Lokasi Saya + Active Region Chip */}
            <div className="pointer-events-auto relative z-30 flex w-full items-center gap-2 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-hud-scrim)] px-3 py-1.5 shadow-lg backdrop-blur-md sm:gap-2.5 sm:px-3.5 sm:py-2">
              <button
                type="button"
                onClick={closeRegionAndResetUrl}
                className="inline-flex shrink-0 items-center gap-2 text-left text-sm font-extrabold tracking-tight text-[var(--color-ink)] hover:text-[var(--color-accent)] sm:text-base"
              >
                <BrandLogo size={24} className="shrink-0 sm:h-7 sm:w-7" />
                <span className="sm:hidden">Siaga Reks</span>
                <span className="hidden sm:inline">Tetep Siaga Reks</span>
              </button>

              <span
                aria-hidden="true"
                className="h-5 w-px shrink-0 bg-[var(--color-border-subtle)]"
              />

              <div className="min-w-0 flex-1">
                <LocationCombobox
                  currentRegion={referenceRegion}
                  savedRegion={savedRegion}
                  placeholder="Cari kecamatan..."
                  onSelectAdm4={navigateToAdm4}
                  onOpen={() => {
                    setAlertPopoverOpen(false);
                    setMoreZonesOpen(false);
                    setSkySimOpen(false);
                    if (activeAdm4 !== null || quakeDrawerOpen) {
                      closeRegionAndResetUrl();
                    }
                  }}
                  onRequestGeolocation={handleLocateMe}
                  geoStatus={geoStatus}
                  geoError={geoError}
                />
              </div>

              {/* Dedicated 1-click "Lokasi saya" button (icon-only on sm/md tablet to give search generous room, full label on lg+) */}
              <button
                type="button"
                disabled={geoStatus === "locating"}
                onClick={handleLocateMe}
                aria-label="Gunakan lokasi saya"
                title="Deteksi kelurahan Malang Raya terdekat dari posisi perangkat Anda"
                className="hidden min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-white px-2.5 text-xs font-extrabold text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-65 sm:inline-flex lg:px-3"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className={
                    geoStatus === "locating"
                      ? "animate-spin text-[var(--color-accent)]"
                      : "text-[var(--color-accent)]"
                  }
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="7"
                    stroke="currentColor"
                    strokeWidth="2.1"
                  />
                  <circle cx="12" cy="12" r="2.4" fill="currentColor" />
                  <path
                    d="M12 2v3M12 19v3M2 12h3M19 12h3"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="hidden lg:inline">
                  {geoStatus === "locating" ? "Mencari..." : "Lokasi saya"}
                </span>
              </button>

              {/* Mobile-only compact link to Panduan */}
              <Link
                href="/tentang"
                className="inline-flex min-h-10 shrink-0 items-center rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-2.5 text-xs font-extrabold text-[var(--color-ink)] sm:hidden"
              >
                Panduan
              </Link>

              {/* Active Region Chip: ONLY shown when a region is actually selected */}
              {selectedRegion && (
                <span className="hidden min-h-11 shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-accent)]/35 bg-[#e6f2fb] px-2.5 text-xs font-extrabold text-[var(--color-accent)] lg:inline-flex">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    />
                    <circle cx="12" cy="9.5" r="2.5" fill="currentColor" />
                  </svg>
                  <span className="max-w-[115px] truncate">
                    {selectedRegion.kecamatan}
                  </span>
                </span>
              )}
            </div>

            {/* Offline Status Banner */}
            {!isOnline && (
              <div
                role="status"
                className="pointer-events-auto relative z-20 flex items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[#b45309]/40 bg-[var(--color-warn-bg)] px-3 py-2 text-xs font-bold text-[var(--color-warn-ink)] shadow-md"
              >
                <span>
                  Koneksi internet terputus. Menampilkan data cuaca tersimpan
                  terakhir dari perangkat.
                </span>
              </div>
            )}

            {/* Geolocation Error / Out-of-area / Network-accuracy Notice Banner */}
            {(geoError || geoNotice) && (
              <div
                role="status"
                className="pointer-events-auto relative z-20 flex items-center justify-between gap-2 rounded-[var(--radius-control)] border border-[#b45309]/40 bg-[var(--color-warn-bg)] px-3 py-2 text-xs font-semibold text-[var(--color-warn-ink)] shadow-md"
              >
                <span>{geoError ?? geoNotice}</span>
                <button
                  type="button"
                  onClick={() => {
                    clearGeoError();
                    setGeoNotice(null);
                  }}
                  aria-label="Tutup pesan lokasi"
                  className="rounded px-1.5 py-0.5 text-[11px] font-extrabold hover:bg-black/5"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Row 2: Live BMKG CAP 1.2 Weather Warning Pill + Single-Row Quick Kecamatan Strip */}
            <div
              className={`relative z-10 flex w-full flex-wrap items-center justify-between gap-2 lg:flex-nowrap ${
                anyDrawerOpen ? "hidden md:flex" : "flex"
              }`}
            >
              {(() => {
                const activeAlert = liveAlerts.activeAlert;
                const isDanger = activeAlert?.severity === "bahaya";
                const isWarning = Boolean(activeAlert);
                const pillStyle = isDanger
                  ? "border-[#b91c1c]/55 bg-[var(--color-danger-bg)] text-[var(--color-danger-ink)] hover:border-[#991b1b]"
                  : isWarning
                    ? "border-[#b45309]/45 bg-[var(--color-warn-bg)] text-[var(--color-warn-ink)] hover:border-[#92400e]"
                    : "border-[var(--color-safe-ink)]/30 bg-[var(--color-safe-bg)] text-[var(--color-safe-ink)] hover:border-[var(--color-safe-ink)]/60";

                return (
                  <div className="pointer-events-auto relative shrink-0">
                    <button
                      type="button"
                      aria-expanded={alertPopoverOpen}
                      title={
                        activeAlert
                          ? "Klik untuk membaca detail peringatan dini cuaca resmi BMKG"
                          : "Klik untuk melihat status pemeriksaan peringatan dini BMKG"
                      }
                      onClick={() => {
                        setMoreZonesOpen(false);
                        setSkySimOpen(false);
                        if (activeAdm4 !== null || quakeDrawerOpen) {
                          closeRegionAndResetUrl();
                        }
                        setAlertPopoverOpen((v) => !v);
                      }}
                      className={`group inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-extrabold shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 sm:gap-2 sm:px-3.5 ${pillStyle}`}
                    >
                      {isWarning ? (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          className="shrink-0"
                        >
                          <path
                            d="M12 3L22 20H2L12 3Z"
                            fill={isDanger ? "#dc2626" : "#d97706"}
                            stroke={isDanger ? "#7f1d1d" : "#78350f"}
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 9v5M12 17h.01"
                            stroke="#ffffff"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          className="shrink-0"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            fill="#16a34a"
                            stroke="#14532d"
                            strokeWidth="1.6"
                          />
                          <path
                            d="M8.5 12.3l2.3 2.3 4.8-5"
                            stroke="#ffffff"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}

                      {activeAlert ? (
                        <>
                          <span className="sm:hidden">
                            {isDanger ? "Cuaca Bahaya" : "Cuaca Waspada"} (
                            {activeAlert.affectedKecamatan.length})
                          </span>
                          <span className="hidden sm:inline">
                            {isDanger ? "Cuaca Bahaya" : "Cuaca Waspada"} (
                            {activeAlert.affectedKecamatan.length} kec.)
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="sm:hidden">Cuaca Aman</span>
                          <span className="hidden sm:inline">
                            Cuaca Aman · Malang Raya
                          </span>
                        </>
                      )}

                      <span className="hidden items-center gap-1 rounded bg-black/8 px-1.5 py-0.5 text-[10px] font-extrabold group-hover:bg-black/14 sm:inline-flex">
                        <span>
                          {alertPopoverOpen ? "Sembunyikan" : "Lihat detail"}
                        </span>
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                          className={`transition-transform ${
                            alertPopoverOpen ? "rotate-180" : ""
                          }`}
                        >
                          <path
                            d="M6 9l6 6 6-6"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </button>
                  </div>
                );
              })()}

              {/* Mobile-only compact Gempa pill */}
              <button
                type="button"
                onClick={() => {
                  setAlertPopoverOpen(false);
                  setQuakeDrawerOpen((v) => !v);
                }}
                className="pointer-events-auto inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-white px-3 text-xs font-extrabold text-[var(--color-ink)] shadow-md sm:hidden"
              >
                <span>Gempa</span>
                <Badge
                  variant={
                    liveQuakes.latest.magnitude >= 5 ? "waspada" : "aman"
                  }
                >
                  M {liveQuakes.latest.magnitude.toFixed(1)}
                </Badge>
              </button>

              {/* Single-row Kecamatan Quick Strip + "Lainnya (41)" */}
              <div
                ref={moreMenuRef}
                className="pointer-events-auto relative hidden min-w-0 items-center gap-1.5 lg:flex"
              >
                <nav
                  aria-label="Pilih cepat kecamatan"
                  className="no-scrollbar flex flex-nowrap items-center gap-1.5 overflow-x-auto py-0.5"
                >
                  {quickZoneKecamatans.map((kec) => {
                    const active = selectedRegion?.adm3 === kec.adm3;
                    const displayName =
                      kec.adm3 === "35.79.01" ? "Kota Batu" : kec.name;
                    return (
                      <button
                        key={kec.adm3}
                        type="button"
                        aria-pressed={active}
                        onClick={() => selectKecamatan(kec)}
                        className={`min-h-10 shrink-0 rounded-full border px-3.5 text-xs font-bold shadow-sm transition-colors ${
                          active
                            ? "border-transparent bg-[var(--color-accent)] text-white shadow-md"
                            : "border-[var(--color-border-subtle)] bg-white/95 text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:bg-white"
                        }`}
                      >
                        {displayName}
                      </button>
                    );
                  })}
                </nav>

                <button
                  type="button"
                  aria-expanded={moreZonesOpen}
                  onClick={() => {
                    setAlertPopoverOpen(false);
                    setSkySimOpen(false);
                    if (activeAdm4 !== null || quakeDrawerOpen) {
                      closeRegionAndResetUrl();
                    }
                    setMoreZonesOpen((v) => !v);
                  }}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-3.5 text-xs font-extrabold text-[var(--color-ink)] shadow-sm hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  <span>Lainnya (41)</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
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

                {moreZonesOpen && (
                  <div
                    role="dialog"
                    aria-label="Daftar lengkap 41 kecamatan Malang Raya"
                    className="absolute top-12 right-0 z-40 max-h-80 w-80 overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-3 shadow-2xl"
                  >
                    <p className="px-1 text-xs font-extrabold text-[var(--color-ink)]">
                      Pilih dari 41 Kecamatan Malang Raya
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-1">
                      {KECAMATAN_MAP.kecamatan.map((kec) => {
                        const active = selectedRegion?.adm3 === kec.adm3;
                        return (
                          <button
                            key={kec.adm3}
                            type="button"
                            aria-pressed={active}
                            onClick={() => selectKecamatan(kec)}
                            className={`flex min-h-10 items-center justify-between rounded-[var(--radius-control)] px-2.5 text-left text-xs font-semibold transition-colors ${
                              active
                                ? "bg-[var(--color-accent)] text-white"
                                : "text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]"
                            }`}
                          >
                            <span className="truncate">{kec.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Island (shown on >= sm; only hidden when drawer occupies top-right on lg+) */}
          <div
            className={`pointer-events-auto hidden shrink-0 items-center gap-2 transition-opacity sm:flex ${
              anyDrawerOpen ? "lg:pointer-events-none lg:opacity-0" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setAlertPopoverOpen(false);
                setMoreZonesOpen(false);
                if (activeAdm4 !== null) {
                  closeRegionAndResetUrl();
                }
                setQuakeDrawerOpen((v) => !v);
              }}
              title="Buka informasi gempa bumi terkini BMKG"
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-white px-3.5 text-xs font-extrabold text-[var(--color-ink)] shadow-md transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-subtle)]"
            >
              <span>Info Gempa</span>
              <Badge
                variant={liveQuakes.latest.magnitude >= 5 ? "waspada" : "aman"}
              >
                M {liveQuakes.latest.magnitude.toFixed(1)}
              </Badge>
            </button>

            <Link
              href="/tentang"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-white px-3.5 text-xs font-extrabold text-[var(--color-ink)] shadow-md transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-subtle)]"
            >
              Tentang &amp; Siaga
            </Link>
          </div>
        </div>
      </header>

      {/* Full-Viewport Persistent Realistic MapLibre Stage */}
      <main id="konten-utama" className="relative h-full w-full">
        <RealisticMalangMap
          selectedRegion={selectedRegion}
          drawerOpen={anyDrawerOpen}
          summaries={liveSummaries}
          onSelectKecamatan={selectKecamatan}
          onSelectDesa={navigateToAdm4}
          onEmptyMapClick={() => {
            setAlertPopoverOpen(false);
            setMoreZonesOpen(false);
            setSkySimOpen(false);
            if (activeAdm4 !== null || quakeDrawerOpen) {
              closeRegionAndResetUrl();
            }
          }}
        />

        {/* Bottom Dock: single cohesive flex-col stack on mobile (0 overlap above 2-line attribution); independent corners on >= sm */}
        <div className="pointer-events-none fixed inset-x-3 bottom-[58px] z-20 flex flex-col items-start gap-2 sm:contents">
          {/* Bottom-Left Suhu Wilayah Legend */}
          <div
            ref={skyPanelRef}
            className={`pointer-events-auto relative sm:fixed sm:bottom-3 sm:left-4 sm:z-20 ${
              anyDrawerOpen ? "hidden md:block" : "block"
            }`}
          >
            <button
              type="button"
              aria-expanded={legendExpandedMobile}
              onClick={() => setLegendExpandedMobile((v) => !v)}
              className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-white px-3 text-xs font-extrabold text-[var(--color-ink)] shadow-lg lg:hidden"
            >
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#38bdf8]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#84cc16]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
              </span>
              <span>
                {legendExpandedMobile ? "Tutup legenda" : "Legenda suhu"}
              </span>
            </button>

            <div
              className={`${
                legendExpandedMobile
                  ? "absolute bottom-12 left-0 flex w-[min(calc(100vw-24px),420px)] lg:static lg:mt-0 lg:w-auto"
                  : "hidden lg:flex"
              } flex-wrap items-center gap-2.5 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-xs shadow-lg xl:gap-3 xl:px-3.5`}
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-extrabold text-[var(--color-ink)]">
                  Suhu Wilayah:
                </span>
                {TEMP_LEGEND.map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-1 text-[var(--color-ink)]"
                  >
                    <span
                      aria-hidden="true"
                      style={{ backgroundColor: item.color }}
                      className="h-3 w-3 rounded-[3px] border border-black/20"
                    />
                    <span className="tabular-nums font-bold">{item.label}</span>
                  </span>
                ))}
              </div>

              <span
                aria-hidden="true"
                className="hidden h-4 w-px bg-[var(--color-border-subtle)] sm:inline-block"
              />

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-expanded={skySimOpen}
                  onClick={() => setSkySimOpen((v) => !v)}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-[var(--radius-control)] border px-2.5 text-[11px] font-bold transition-colors ${
                    skyOverride !== "auto" || skySimOpen
                      ? "border-[var(--color-accent)] bg-[#e6f2fb] text-[var(--color-accent)]"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  <span>
                    Simulasi langit
                    {skyOverride !== "auto" ? `: ${activeSky.label}` : ""}
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M18 15l-6-6-6 6"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  aria-pressed={motionPaused}
                  onClick={() => setMotionPaused((p) => !p)}
                  title={
                    motionPaused
                      ? "Jalankan kembali animasi awan dan ikon cuaca"
                      : "Hentikan animasi awan dan ikon cuaca"
                  }
                  className={`min-h-8 rounded-[var(--radius-control)] border px-2.5 text-[11px] font-bold transition-colors ${
                    motionPaused
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {motionPaused ? "Animasi dijeda" : "Jeda animasi"}
                </button>
              </div>
            </div>

            {skySimOpen && (
              <div
                role="dialog"
                aria-label="Simulasi tampilan langit"
                className="absolute bottom-13 left-0 z-40 w-72 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-4 text-xs shadow-2xl"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-[var(--color-ink)]">
                      Simulasi tampilan langit
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[var(--color-ink-muted)]">
                      Pratinjau suasana kanopi langit tanpa mengubah angka data
                      cuaca BMKG.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSkySimOpen(false)}
                    aria-label="Tutup simulasi langit"
                    className="flex h-8 w-8 items-center justify-center rounded text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)]"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 6l12 12M18 6L6 18"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                <div className="mt-3 flex flex-col gap-1.5">
                  {SKY_MODES.map((m) => {
                    const active = skyOverride === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSkyOverride(m.id)}
                        className={`flex min-h-10 items-center justify-between rounded-[var(--radius-control)] border px-3 text-left text-xs font-bold transition-colors ${
                          active
                            ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                            : "border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] text-[var(--color-ink)] hover:border-[var(--color-accent)]"
                        }`}
                      >
                        <span>{m.label}</span>
                        {active && (
                          <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">
                            Aktif
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Quick Overview Card (full-width cohesive dock on mobile; floating bottom-right on >= sm) */}
          {!anyDrawerOpen && (
            <div className="pointer-events-auto w-full sm:fixed sm:right-4 sm:bottom-16 sm:z-20 sm:w-auto">
              <button
                type="button"
                onClick={() => navigateToAdm4(overviewQuickCard.region.adm4)}
                className="flex min-h-[54px] w-full items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white px-3.5 py-2 text-left shadow-lg transition-transform hover:-translate-y-0.5 hover:border-[var(--color-accent)] sm:min-h-12 sm:w-auto sm:justify-start sm:gap-2.5 sm:px-4"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <WeatherIcon
                    code={overviewQuickCard.weatherCode}
                    size={34}
                    className="shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-xs font-extrabold text-[var(--color-ink)]">
                        {overviewQuickCard.region.desa}, Kec.{" "}
                        {overviewQuickCard.region.kecamatan}
                      </span>
                      {overviewQuickCard.isSaved && (
                        <span className="shrink-0 rounded bg-[#e6f2fb] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-accent)]">
                          Terakhir dilihat
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums block text-xs font-semibold text-[var(--color-accent)]">
                      {overviewQuickCard.tempC}°C ·{" "}
                      {overviewQuickCard.weatherDesc}
                      <span className="hidden sm:inline"> · Buka detail</span>
                    </span>
                  </span>
                </span>

                <span className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-control)] bg-[#eef6fc] px-2.5 py-1.5 text-[11px] font-extrabold text-[var(--color-accent)] sm:hidden">
                  <span>Detail</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Slide-in Region Weather Drawer (live BMKG data + loading/error/stale states) */}
      {selectedRegion && (
        <RegionDrawer
          region={selectedRegion}
          forecast={
            activeForecast?.region.adm4 === selectedRegion.adm4
              ? activeForecast
              : null
          }
          isLoading={isLoadingForecast}
          errorMessage={forecastError}
          onRetry={handleRetryForecast}
          sky={activeSky}
          open={regionDrawerOpen}
          onClose={closeRegionAndResetUrl}
          onSelectAdm4={navigateToAdm4}
        />
      )}

      {/* Slide-in Quake Drawer (live BMKG TEWS + lazy MapLibre epicenter map + lazy shakemap) */}
      <QuakeDrawer
        open={quakeDrawerOpen}
        onClose={() => setQuakeDrawerOpen(false)}
        quakes={liveQuakes}
        isRefreshing={isRefreshingQuakes}
        refreshError={quakeRefreshError}
        refreshSuccessMsg={quakeRefreshSuccess}
        onRefresh={handleRefreshQuakes}
        region={referenceRegion}
      />

      {/* Centered Modal Popup for BMKG CAP 1.2 Weather Warning (spacious & scrollable for long East Java notices) */}
      {alertPopoverOpen &&
        (() => {
          const activeAlert = liveAlerts.activeAlert;
          const isDanger = activeAlert?.severity === "bahaya";
          const isWarning = Boolean(activeAlert);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <button
                type="button"
                aria-label="Tutup popup peringatan dini cuaca"
                onClick={() => setAlertPopoverOpen(false)}
                className="fixed inset-0 bg-slate-900/45"
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Detail peringatan dini cuaca resmi BMKG"
                className={`relative z-10 flex max-h-[86dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-map)] border-2 shadow-2xl ${
                  isDanger
                    ? "border-[#b91c1c]/45 bg-[var(--color-danger-bg)] text-[var(--color-danger-ink)]"
                    : isWarning
                      ? "border-[#b45309]/40 bg-[var(--color-warn-bg)] text-[var(--color-warn-ink)]"
                      : "border-[var(--color-safe-ink)]/30 bg-white text-[var(--color-ink)]"
                }`}
              >
                {/* Modal Header */}
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/10 px-5 py-4">
                  <div>
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white ${
                        isDanger
                          ? "bg-[#991b1b]"
                          : isWarning
                            ? "bg-[#78350f]"
                            : "bg-[#15803d]"
                      }`}
                    >
                      {activeAlert
                        ? "PERINGATAN DINI RESMI BMKG (CAP 1.2)"
                        : "STATUS RESMI BMKG (CAP 1.2)"}
                    </span>
                    <h2 className="mt-2 text-base font-extrabold leading-snug">
                      {activeAlert
                        ? activeAlert.headline
                        : "Tidak ada peringatan dini cuaca ekstrem aktif di Malang Raya"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAlertPopoverOpen(false)}
                    aria-label="Tutup popup peringatan"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-black/15 bg-white/80 text-current hover:bg-white"
                  >
                    <svg
                      width="14"
                      height="14"
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
                  </button>
                </div>

                {/* Modal Scrollable Body */}
                <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4 text-xs">
                  {alertRefreshSuccess && !alertRefreshError && (
                    <div
                      role="status"
                      className="rounded-[var(--radius-control)] border border-[var(--color-safe-ink)]/25 bg-[var(--color-safe-bg)] px-3 py-2 font-bold text-[var(--color-safe-ink)]"
                    >
                      {alertRefreshSuccess}
                    </div>
                  )}
                  {alertRefreshError && (
                    <div
                      role="alert"
                      className="rounded-[var(--radius-control)] border border-[#b91c1c]/35 bg-white px-3 py-2 font-bold text-[#991b1b]"
                    >
                      {alertRefreshError}
                    </div>
                  )}

                  {activeAlert ? (
                    <>
                      {/* Highlighted Malang Raya Affected Kecamatan Chips (clickable to inspect weather!) */}
                      <div className="rounded-[var(--radius-card)] border border-black/10 bg-white/85 p-3.5 text-[var(--color-ink)]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-extrabold">
                            Kecamatan Malang Raya Terdampak (
                            {activeAlert.affectedKecamatan.length})
                          </p>
                          <span className="tabular-nums rounded bg-[#fef3c7] px-2 py-0.5 text-[11px] font-extrabold text-[#78350f]">
                            Berlaku {activeAlert.effectiveWib} -{" "}
                            {activeAlert.expiresWib}
                          </span>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {activeAlert.affectedKecamatan.map((name) => {
                            const matchedKec = KECAMATAN_MAP.kecamatan.find(
                              (k) =>
                                k.name.toLowerCase() === name.toLowerCase(),
                            );
                            return matchedKec ? (
                              <button
                                key={name}
                                type="button"
                                onClick={() => selectKecamatan(matchedKec)}
                                className="inline-flex min-h-9 items-center rounded-full border border-[#b45309]/35 bg-[#fffbeb] px-3 text-xs font-bold text-[#78350f] transition-colors hover:border-[#92400e] hover:bg-[#fef3c7]"
                              >
                                {name}
                              </button>
                            ) : (
                              <span
                                key={name}
                                className="inline-flex min-h-9 items-center rounded-full border border-black/15 bg-white px-3 text-xs font-bold"
                              >
                                {name}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Structured official BMKG CAP 1.2 summary, impact & collapsible East Java region list */}
                      {(() => {
                        const formatted = formatCapDescription(
                          activeAlert.description,
                        );
                        return (
                          <div className="space-y-3 rounded-[var(--radius-card)] border border-black/10 bg-white/85 p-4 text-[var(--color-ink)]">
                            <p className="text-[11px] font-extrabold tracking-wide text-[var(--color-ink-muted)]">
                              DETAIL RESMI BMKG JAWA TIMUR
                            </p>

                            {formatted.leadSentence && (
                              <p className="text-sm font-bold leading-relaxed text-[var(--color-ink)]">
                                {formatted.leadSentence}
                              </p>
                            )}

                            {formatted.advisoryParagraphs.length > 0 && (
                              <ul className="space-y-1.5 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                                {formatted.advisoryParagraphs.map((line) => (
                                  <li
                                    key={line}
                                    className="flex items-start gap-2"
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b45309]"
                                    />
                                    <span>{line}</span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {formatted.regionsTitleCase.length > 0 && (
                              <details className="rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3.5 py-2.5">
                                <summary className="text-xs font-extrabold text-[var(--color-accent)]">
                                  Lihat seluruh cakupan wilayah se-Jawa Timur (
                                  {formatted.regionsTitleCase.length} kecamatan)
                                </summary>
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                  {formatted.regionsTitleCase.map((regName) => (
                                    <span
                                      key={regName}
                                      className="rounded-md border border-[var(--color-border-subtle)] bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--color-ink)]"
                                    >
                                      {regName}
                                    </span>
                                  ))}
                                </div>
                              </details>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
                      Feed nowcast resmi BMKG telah diperiksa pada pukul{" "}
                      <span className="tabular-nums font-bold text-[var(--color-ink)]">
                        {liveAlerts.checkedAtWib}
                      </span>
                      .{" "}
                      {liveAlerts.allJatimCount > 0
                        ? `Terdapat ${liveAlerts.allJatimCount} peringatan aktif di wilayah Jawa Timur lainnya, namun poligonnya tidak mencakup 41 kecamatan Malang Raya.`
                        : "Saat ini tidak ada peringatan nowcast aktif untuk wilayah Jawa Timur maupun Malang Raya."}
                    </p>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-black/10 bg-white/60 px-5 py-3 text-xs">
                  <span className="text-[11px] font-medium opacity-85">
                    {liveAlerts.sourceLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isRefreshingAlerts}
                      onClick={handleRefreshAlerts}
                      className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-black/15 bg-white px-3 text-xs font-extrabold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-60"
                    >
                      {isRefreshingAlerts ? "Memperbarui..." : "Perbarui"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlertPopoverOpen(false)}
                      className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] bg-[var(--color-accent)] px-3.5 text-xs font-extrabold text-white hover:bg-[var(--color-accent-hover)]"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
