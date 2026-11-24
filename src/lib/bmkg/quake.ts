import type { Quake, QuakeBundle } from "@/types";
import { BmkgFetchError, fetchBmkgJson, getBmkgDataBaseUrl } from "./client";
import { formatNowWibTime } from "./forecast";
import {
  BmkgAutoGempaResponseSchema,
  BmkgGempaListResponseSchema,
  type BmkgRawGempa,
} from "./schemas";

const QUAKE_TTL_MS = 5 * 60 * 1000; // 5 menit sesuai kesegaran feed TEWS BMKG

export function parseBmkgCoordinates(coordStr: string): {
  lat: number;
  lng: number;
} {
  const parts = coordStr.split(",").map((s) => Number.parseFloat(s.trim()));
  const lat = parts[0];
  const lng = parts[1];
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    Number.isNaN(lat) ||
    Number.isNaN(lng)
  ) {
    throw new BmkgFetchError(`Format koordinat gempa tidak valid: ${coordStr}`);
  }
  return { lat, lng };
}

export function parseBmkgDepthKm(depthStr: string): number {
  const match = depthStr.match(/[\d.]+/);
  if (!match) return 0;
  const val = Number.parseFloat(match[0]);
  return Number.isNaN(val) ? 0 : Math.round(val);
}

export function parseBmkgRawQuake(raw: BmkgRawGempa, index = 0): Quake {
  const { lat, lng } = parseBmkgCoordinates(raw.Coordinates);
  const mag = Number.parseFloat(raw.Magnitude);
  const magnitude = Number.isNaN(mag) ? 0 : Number(mag.toFixed(1));
  const depthKm = parseBmkgDepthKm(raw.Kedalaman);

  const rawPotential = raw.Potensi?.trim();
  const potential =
    rawPotential && rawPotential !== "-" && rawPotential.length > 0
      ? rawPotential
      : null;

  const rawFelt = raw.Dirasakan?.trim();
  const feltMmi =
    rawFelt && rawFelt !== "-" && rawFelt.length > 0 ? rawFelt : null;

  const rawShakemap = raw.Shakemap?.trim();
  const shakemapUrl =
    rawShakemap && rawShakemap.length > 0
      ? `/api/gempa/shakemap/${encodeURIComponent(rawShakemap)}`
      : null;

  return {
    id: `${raw.DateTime}-${lat.toFixed(2)}-${lng.toFixed(2)}-${index}`,
    dateTimeIso: raw.DateTime,
    wibLabel: `${raw.Tanggal}, ${raw.Jam}`,
    lat,
    lng,
    magnitude,
    depthKm,
    regionDesc: raw.Wilayah.trim(),
    potential,
    feltMmi,
    shakemapUrl,
  };
}

export function parseAutoGempaResponse(raw: unknown): Quake {
  const parsed = BmkgAutoGempaResponseSchema.parse(raw);
  return parseBmkgRawQuake(parsed.Infogempa.gempa, 0);
}

export function parseGempaListResponse(raw: unknown): Quake[] {
  const parsed = BmkgGempaListResponseSchema.parse(raw);
  return parsed.Infogempa.gempa.map((item, idx) =>
    parseBmkgRawQuake(item, idx),
  );
}

interface CachedQuakeBundle {
  bundle: QuakeBundle;
  fetchedAtMs: number;
}

let quakeCache: CachedQuakeBundle | null = null;
let inflightQuakeBundle: Promise<QuakeBundle> | null = null;

export function clearQuakeCacheForTests(): void {
  quakeCache = null;
  inflightQuakeBundle = null;
}

/**
 * Ambil 3 umpan resmi BMKG TEWS secara paralel (autogempa, gempaterkini M5+, gempadirasakan)
 * dengan cache 5 menit dan fallback stale yang jujur bila server BMKG sedang lambat.
 */
export async function getLiveQuakeBundle(options?: {
  forceRefresh?: boolean;
}): Promise<QuakeBundle> {
  const forceRefresh = Boolean(options?.forceRefresh);
  const now = Date.now();
  if (
    !forceRefresh &&
    quakeCache &&
    now - quakeCache.fetchedAtMs < QUAKE_TTL_MS
  ) {
    return quakeCache.bundle;
  }

  if (!forceRefresh && inflightQuakeBundle) {
    return inflightQuakeBundle;
  }

  const runFetch = (async (): Promise<QuakeBundle> => {
    try {
      const base = getBmkgDataBaseUrl();
      const fetchOpts = forceRefresh
        ? { noStore: true }
        : { revalidateSeconds: 300 };
      const [autoRes, m5Res, feltRes] = await Promise.allSettled([
        fetchBmkgJson<unknown>(
          `${base}/DataMKG/TEWS/autogempa.json`,
          fetchOpts,
        ),
        fetchBmkgJson<unknown>(
          `${base}/DataMKG/TEWS/gempaterkini.json`,
          fetchOpts,
        ),
        fetchBmkgJson<unknown>(
          `${base}/DataMKG/TEWS/gempadirasakan.json`,
          fetchOpts,
        ),
      ]);

      const allFailed =
        autoRes.status !== "fulfilled" &&
        m5Res.status !== "fulfilled" &&
        feltRes.status !== "fulfilled";

      if (allFailed) {
        throw new BmkgFetchError(
          "Ketiga umpan gempa TEWS BMKG belum dapat dijangkau saat ini",
        );
      }

      const recentM5 =
        m5Res.status === "fulfilled"
          ? parseGempaListResponse(m5Res.value)
          : (quakeCache?.bundle.recentM5 ?? []);

      const felt =
        feltRes.status === "fulfilled"
          ? parseGempaListResponse(feltRes.value)
          : (quakeCache?.bundle.felt ?? []);

      let latest: Quake | null = null;
      if (autoRes.status === "fulfilled") {
        latest = parseAutoGempaResponse(autoRes.value);
      } else if (recentM5[0]) {
        latest = recentM5[0];
      } else if (felt[0]) {
        latest = felt[0];
      }

      if (!latest) {
        throw new BmkgFetchError(
          "Ketiga umpan gempa TEWS BMKG belum dapat dijangkau saat ini",
        );
      }

      const updatedAtWib = formatNowWibTime();
      const partialFail =
        autoRes.status !== "fulfilled" ||
        m5Res.status !== "fulfilled" ||
        feltRes.status !== "fulfilled";

      const bundle: QuakeBundle = {
        latest,
        recentM5,
        felt,
        updatedAtWib,
        sourceLabel: partialFail
          ? `Data resmi BMKG TEWS · Sebagian umpan melambat (${updatedAtWib})`
          : `Data resmi BMKG TEWS · Pembaruan ${updatedAtWib}`,
        isStale: partialFail,
        isFixtureSample: false,
      };

      quakeCache = {
        bundle,
        fetchedAtMs: Date.now(),
      };
      return bundle;
    } catch (err) {
      if (quakeCache) {
        return {
          ...quakeCache.bundle,
          isStale: true,
          sourceLabel: `Menampilkan data gempa terakhir pukul ${quakeCache.bundle.updatedAtWib} (server BMKG TEWS sedang lambat)`,
        };
      }
      throw err;
    } finally {
      if (!forceRefresh) {
        inflightQuakeBundle = null;
      }
    }
  })();

  if (!forceRefresh) {
    inflightQuakeBundle = runFetch;
  }
  return runFetch;
}
