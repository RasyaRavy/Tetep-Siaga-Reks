import type { Forecast } from "@/types";

const OFFLINE_CACHE_KEY = "tsr:offline-forecasts";
const MAX_CACHED_REGIONS = 6;

interface StoredForecastMap {
  [adm4: string]: {
    savedAtMs: number;
    forecast: Forecast;
  };
}

function readMap(): StoredForecastMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OFFLINE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredForecastMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLocalForecast(forecast: Forecast): void {
  if (typeof window === "undefined") return;
  try {
    const current = readMap();
    current[forecast.region.adm4] = {
      savedAtMs: Date.now(),
      forecast,
    };

    const entries = Object.entries(current).sort(
      (a, b) => b[1].savedAtMs - a[1].savedAtMs,
    );
    const trimmed: StoredForecastMap = {};
    for (const [key, value] of entries.slice(0, MAX_CACHED_REGIONS)) {
      trimmed[key] = value;
    }

    window.localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    // Abaikan galat kuota penyimpanan pada mode privat
  }
}

export function loadLocalForecast(adm4: string): Forecast | null {
  const map = readMap();
  const entry = map[adm4];
  if (!entry?.forecast) return null;
  return {
    ...entry.forecast,
    isStale: true,
    sourceLabel: `Data tersimpan di perangkat (pukul ${entry.forecast.updatedAtWib})`,
  };
}
