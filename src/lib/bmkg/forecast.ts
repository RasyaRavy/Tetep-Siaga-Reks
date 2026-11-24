import {
  getKecamatanByAdm3,
  getRegionByAdm4,
  KECAMATAN_MAP,
} from "@/lib/regions";
import type {
  Forecast,
  ForecastDay,
  ForecastSlot,
  KecamatanWeatherSummary,
  Region,
} from "@/types";
import { BmkgFetchError, fetchBmkgJson, getBmkgApiBaseUrl } from "./client";
import {
  type BmkgForecastResponse,
  BmkgForecastResponseSchema,
} from "./schemas";

const DAY_NAMES_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const MONTH_NAMES_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const BMKG_WEATHER_LABELS_ID: Record<number, string> = {
  0: "Cerah",
  1: "Cerah",
  2: "Cerah Berawan",
  3: "Berawan",
  4: "Berawan Tebal",
  5: "Udara Kabur",
  10: "Udara Kabur",
  45: "Kabut",
  60: "Hujan Ringan",
  61: "Hujan Ringan",
  63: "Hujan Sedang",
  65: "Hujan Lebat",
  80: "Hujan Lokal",
  95: "Hujan Petir",
  97: "Hujan Petir",
};

export function normalizeWeatherDesc(code: number, rawDesc: string): string {
  const trimmed = rawDesc.trim();
  if (trimmed.length > 0) return trimmed;
  return BMKG_WEATHER_LABELS_ID[code] ?? "Berawan";
}

export function utcStringToWib(utcDatetime: string): {
  epochMs: number;
  wibDate: string;
  wibTime: string;
  wibHour: number;
  dayLabel: string;
} {
  const iso = utcDatetime.includes("T")
    ? utcDatetime.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(utcDatetime)
      ? utcDatetime
      : `${utcDatetime}Z`
    : `${utcDatetime.replace(" ", "T")}Z`;

  const utcMs = Date.parse(iso);
  if (Number.isNaN(utcMs)) {
    throw new BmkgFetchError(`Format waktu UTC tidak valid: ${utcDatetime}`);
  }

  const wibMs = utcMs + 7 * 60 * 60 * 1000;
  const d = new Date(wibMs);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();

  const wibDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const wibTime = `${String(hour).padStart(2, "0")}.${String(minute).padStart(2, "0")}`;
  const dayName = DAY_NAMES_ID[d.getUTCDay()] ?? "";
  const monthName = MONTH_NAMES_ID[month] ?? "";

  return {
    epochMs: utcMs,
    wibDate,
    wibTime,
    wibHour: hour,
    dayLabel: `${dayName}, ${day} ${monthName}`,
  };
}

export function formatNowWibTime(nowMs: number = Date.now()): string {
  const d = new Date(nowMs + 7 * 60 * 60 * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}.${mm} WIB`;
}

export interface ParseForecastOptions {
  nowMs?: number;
  isStale?: boolean;
  updatedAtWib?: string;
}

/**
 * Validasi respons BMKG menggunakan Zod lalu normalisasi ke tipe domain `Forecast`.
 */
export function parseBmkgForecastResponse(
  raw: unknown,
  region: Region,
  options: ParseForecastOptions = {},
): Forecast {
  const parsed: BmkgForecastResponse = BmkgForecastResponseSchema.parse(raw);
  const firstEntry = parsed.data[0];
  if (!firstEntry) {
    throw new BmkgFetchError("Data cuaca BMKG kosong untuk wilayah ini");
  }

  const nowMs = options.nowMs ?? Date.now();

  const days: ForecastDay[] = firstEntry.cuaca
    .filter((daySlots) => daySlots.length > 0)
    .map((rawSlots, dayIdx) => {
      const slots: ForecastSlot[] = rawSlots.map((s) => {
        const wib = utcStringToWib(s.utc_datetime);
        return {
          utcDatetime: s.utc_datetime,
          wibDate: wib.wibDate,
          wibTime: wib.wibTime,
          wibHour: wib.wibHour,
          tempC: Math.round(s.t),
          humidityPct: Math.round(s.hu),
          rainMm: Number(s.tp.toFixed(1)),
          cloudCoverPct: Math.round(s.tcc),
          windSpeedKmh: Number(s.ws.toFixed(1)),
          windDir: s.wd,
          windDeg: Math.round(s.wd_deg),
          weatherCode: s.weather,
          weatherDesc: normalizeWeatherDesc(s.weather, s.weather_desc),
          visibilityText:
            s.vs_text && s.vs_text.trim().length > 0 ? s.vs_text.trim() : null,
        };
      });

      const firstSlot = slots[0];
      const temps = slots.map((s) => s.tempC);
      const totalRain = Number(
        slots.reduce((acc, s) => acc + s.rainMm, 0).toFixed(1),
      );
      const representative =
        slots.find((s) => s.weatherCode >= 60) ??
        slots[Math.floor(slots.length / 2)] ??
        firstSlot;

      const wibFirst = firstSlot
        ? utcStringToWib(firstSlot.utcDatetime)
        : { wibDate: "", dayLabel: `Hari ${dayIdx + 1}` };

      return {
        date: wibFirst.wibDate,
        dayLabel:
          dayIdx === 0
            ? "Hari ini"
            : dayIdx === 1
              ? "Besok"
              : wibFirst.dayLabel,
        minTempC: temps.length > 0 ? Math.min(...temps) : 0,
        maxTempC: temps.length > 0 ? Math.max(...temps) : 0,
        totalRainMm: totalRain,
        dominantWeatherCode: representative?.weatherCode ?? 3,
        dominantWeatherDesc: representative?.weatherDesc ?? "Berawan",
        slots,
      };
    });

  const allSlots = days.flatMap((d) => d.slots);
  const firstOverallSlot = allSlots[0];
  if (!firstOverallSlot) {
    throw new BmkgFetchError("Slot prakiraan BMKG kosong");
  }

  // Pilih slot aktif yang sedang berlangsung (slot terdekat dengan waktu sekarang)
  let currentSlot = firstOverallSlot;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const s of allSlots) {
    const slotEpoch = utcStringToWib(s.utcDatetime).epochMs;
    const diff = Math.abs(nowMs - slotEpoch);
    if (diff < bestDiff) {
      bestDiff = diff;
      currentSlot = s;
    }
  }

  const updatedAtWib = options.updatedAtWib ?? formatNowWibTime(nowMs);
  const isStale = Boolean(options.isStale);

  return {
    region,
    updatedAtWib,
    sourceLabel: isStale
      ? `Menampilkan data terakhir pukul ${updatedAtWib} (cache BMKG)`
      : `Data resmi BMKG · Pembaruan ${updatedAtWib}`,
    isFixtureSample: false,
    isStale,
    bmkgCoords: {
      lat: parsed.lokasi.lat,
      lng: parsed.lokasi.lon,
    },
    current: currentSlot,
    days,
  };
}

// Server-side in-memory cache + stale fallback store
const FORECAST_TTL_MS = 30 * 60 * 1000; // 30 menit
interface CachedForecastEntry {
  forecast: Forecast;
  fetchedAtMs: number;
  updatedAtWib: string;
}

const forecastCache = new Map<string, CachedForecastEntry>();
const inflightForecasts = new Map<string, Promise<Forecast>>();

export function clearForecastCacheForTests(): void {
  forecastCache.clear();
  inflightForecasts.clear();
  summaryBundleCache = null;
  inflightSummaryBundle = null;
}

export async function getLiveRegionForecast(region: Region): Promise<Forecast> {
  const now = Date.now();
  const cached = forecastCache.get(region.adm4);
  if (cached && now - cached.fetchedAtMs < FORECAST_TTL_MS) {
    return cached.forecast;
  }

  const existingInflight = inflightForecasts.get(region.adm4);
  if (existingInflight) {
    return existingInflight;
  }

  const task = (async (): Promise<Forecast> => {
    try {
      const url = `${getBmkgApiBaseUrl()}/publik/prakiraan-cuaca?adm4=${encodeURIComponent(region.adm4)}`;
      const raw = await fetchBmkgJson<unknown>(url, {
        revalidateSeconds: 1800,
      });
      const updatedAtWib = formatNowWibTime();
      const forecast = parseBmkgForecastResponse(raw, region, {
        updatedAtWib,
        isStale: false,
      });
      forecastCache.set(region.adm4, {
        forecast,
        fetchedAtMs: Date.now(),
        updatedAtWib,
      });
      return forecast;
    } catch (err) {
      // Jika BMKG gagal namun cache lama tersedia, sajikan data terakhir dengan label jujur
      if (cached) {
        return {
          ...cached.forecast,
          isStale: true,
          sourceLabel: `Menampilkan data terakhir pukul ${cached.updatedAtWib} (server BMKG sedang lambat)`,
        };
      }

      // Fallback defensif: bila kode adm4 desa berbeda pada katalog BMKG (404 / HTML), gunakan titik wakil kecamatan yang sama
      const parentKec = getKecamatanByAdm3(region.adm3);
      const isCodeMismatch =
        err instanceof BmkgFetchError &&
        (err.status === 404 || err.message.includes("HTML"));
      if (
        isCodeMismatch &&
        parentKec &&
        parentKec.defaultAdm4 !== region.adm4
      ) {
        const fallbackUrl = `${getBmkgApiBaseUrl()}/publik/prakiraan-cuaca?adm4=${encodeURIComponent(parentKec.defaultAdm4)}`;
        const fallbackRaw = await fetchBmkgJson<unknown>(fallbackUrl, {
          revalidateSeconds: 1800,
        });
        const updatedAtWib = formatNowWibTime();
        const fallbackForecast = parseBmkgForecastResponse(
          fallbackRaw,
          region,
          {
            updatedAtWib,
            isStale: false,
          },
        );
        const enriched: Forecast = {
          ...fallbackForecast,
          sourceLabel: `Data resmi BMKG · Titik terdekat Kec. ${region.kecamatan} (${updatedAtWib})`,
        };
        forecastCache.set(region.adm4, {
          forecast: enriched,
          fetchedAtMs: Date.now(),
          updatedAtWib,
        });
        return enriched;
      }

      throw err;
    } finally {
      inflightForecasts.delete(region.adm4);
    }
  })();

  inflightForecasts.set(region.adm4, task);
  return task;
}

// Ringkasan suhu & cuaca 41 kecamatan (R1) dengan batas konkurensi sopan (5 paralel)
interface CachedSummaryBundle {
  summaries: KecamatanWeatherSummary[];
  updatedAtWib: string;
  fetchedAtMs: number;
  isStale: boolean;
}

let summaryBundleCache: CachedSummaryBundle | null = null;
let inflightSummaryBundle: Promise<CachedSummaryBundle> | null = null;

export async function getLiveKecamatanSummaries(): Promise<{
  summaries: KecamatanWeatherSummary[];
  updatedAtWib: string;
  isStale: boolean;
}> {
  const now = Date.now();
  if (
    summaryBundleCache &&
    now - summaryBundleCache.fetchedAtMs < FORECAST_TTL_MS
  ) {
    return {
      summaries: summaryBundleCache.summaries,
      updatedAtWib: summaryBundleCache.updatedAtWib,
      isStale: false,
    };
  }

  if (inflightSummaryBundle) {
    return inflightSummaryBundle;
  }

  inflightSummaryBundle = (async (): Promise<CachedSummaryBundle> => {
    try {
      const kecs = KECAMATAN_MAP.kecamatan;
      const concurrency = 6;
      const collected: KecamatanWeatherSummary[] = [];

      for (let i = 0; i < kecs.length; i += concurrency) {
        const batch = kecs.slice(i, i + concurrency);
        const batchResults = await Promise.allSettled(
          batch.map(async (k) => {
            const repRegion = getRegionByAdm4(k.defaultAdm4);
            if (!repRegion) {
              throw new Error(`Missing region ${k.defaultAdm4}`);
            }
            const fc = await getLiveRegionForecast(repRegion);
            return {
              adm3: k.adm3,
              tempC: fc.current.tempC,
              weatherCode: fc.current.weatherCode,
              weatherDesc: fc.current.weatherDesc,
              rainMm: fc.current.rainMm,
            };
          }),
        );

        for (let j = 0; j < batch.length; j++) {
          const k = batch[j];
          if (!k) continue;
          const res = batchResults[j];
          if (res?.status === "fulfilled") {
            collected.push(res.value);
          } else {
            const prev = summaryBundleCache?.summaries.find(
              (s) => s.adm3 === k.adm3,
            );
            if (prev) collected.push(prev);
          }
        }

        if (i + concurrency < kecs.length) {
          await new Promise((r) => setTimeout(r, 120));
        }
      }

      if (collected.length === 0) {
        throw new BmkgFetchError(
          "Tidak dapat memuat ringkasan cuaca kecamatan dari BMKG",
        );
      }

      const updatedAtWib = formatNowWibTime();
      const bundle: CachedSummaryBundle = {
        summaries: collected,
        updatedAtWib,
        fetchedAtMs: Date.now(),
        isStale: false,
      };
      summaryBundleCache = bundle;
      return bundle;
    } catch (err) {
      if (summaryBundleCache) {
        return {
          ...summaryBundleCache,
          isStale: true,
        };
      }
      throw err;
    } finally {
      inflightSummaryBundle = null;
    }
  })();

  return inflightSummaryBundle;
}
