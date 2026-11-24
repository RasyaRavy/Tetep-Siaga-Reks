import { XMLParser } from "fast-xml-parser";
import { parseCapPolygon, pointInRing } from "@/lib/geo";
import { KECAMATAN_MAP } from "@/lib/regions";
import type { Alert, AlertBundle, AlertSeverity } from "@/types";
import { fetchBmkgText, getBmkgWebBaseUrl } from "./client";
import { formatNowWibTime } from "./forecast";

const ALERT_TTL_MS = 5 * 60 * 1000; // 5 menit

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false,
});

export interface RssNowcastItem {
  title: string;
  link: string;
  description: string;
  guid: string;
  pubDate: string;
}

function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function asText(val: unknown): string {
  if (typeof val === "string") return val.trim();
  if (typeof val === "number") return String(val);
  if (val && typeof val === "object" && "#text" in val) {
    return String((val as { "#text": unknown })["#text"]).trim();
  }
  return "";
}

export function formatIsoToWibLabel(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return formatNowWibTime(ms);
}

export function mapCapSeverity(rawSeverity: string): AlertSeverity {
  const s = rawSeverity.trim().toLowerCase();
  if (s === "extreme" || s === "severe") return "bahaya";
  if (s === "moderate") return "waspada";
  return "aman";
}

export function parseRssNowcastXml(xml: string): RssNowcastItem[] {
  const parsed = xmlParser.parse(xml) as {
    rss?: {
      channel?: {
        item?: unknown;
      };
    };
  };

  const rawItems = toArray(parsed.rss?.channel?.item);
  return rawItems
    .map((entry) => {
      const obj = entry as Record<string, unknown>;
      return {
        title: asText(obj.title),
        link: asText(obj.link),
        description: asText(obj.description),
        guid: asText(obj.guid),
        pubDate: asText(obj.pubDate),
      };
    })
    .filter((item) => item.link.length > 0);
}

export function isJawaTimurNowcastItem(item: RssNowcastItem): boolean {
  const haystack = `${item.title} ${item.description}`.toLowerCase();
  if (
    haystack.includes("jawa timur") ||
    haystack.includes("malang") ||
    haystack.includes("kota batu")
  ) {
    return true;
  }
  // Kode CAP BMKG Jawa Timur: CJI...
  return /\/CJI\d+/i.test(item.link);
}

/**
 * Temukan daftar kecamatan Malang Raya yang terdampak berdasarkan irisan poligon CAP
 * atau kecocokan nama kecamatan eksplisit di deskripsi CAP.
 */
export function matchAffectedMalangKecamatan(
  capPolygonRings: Array<Array<[number, number]>>,
  description: string,
): string[] {
  const matched = new Set<string>();
  const upperDesc = description.toUpperCase();

  for (const kec of KECAMATAN_MAP.kecamatan) {
    // 1. Cek irisan geometris titik tengah kecamatan terhadap poligon CAP
    const inAnyPoly = capPolygonRings.some((ring) =>
      pointInRing({ lat: kec.lat, lng: kec.lng }, ring),
    );
    if (inAnyPoly) {
      matched.add(kec.name);
      continue;
    }

    // 2. Cek penyebutan nama kecamatan di deskripsi (khususnya jika area Malang/Batu disebut)
    if (
      upperDesc.includes("MALANG") ||
      upperDesc.includes("JAWA TIMUR") ||
      upperDesc.includes("BATU")
    ) {
      const escaped = kec.name
        .toUpperCase()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`(^|[^A-Z])${escaped}($|[^A-Z])`);
      if (pattern.test(upperDesc)) {
        matched.add(kec.name);
      }
    }
  }

  return Array.from(matched);
}

export function parseCapAlertForMalangRaya(
  capXml: string,
  nowMs: number = Date.now(),
): Alert | null {
  const parsed = xmlParser.parse(capXml) as {
    alert?: {
      identifier?: unknown;
      info?: unknown;
    };
  };

  const alertNode = parsed.alert;
  if (!alertNode) return null;

  const infos = toArray(alertNode.info) as Array<Record<string, unknown>>;
  const info =
    infos.find((i) => asText(i.language).toLowerCase().startsWith("id")) ??
    infos[0];
  if (!info) return null;

  const expiresIso = asText(info.expires);
  if (expiresIso) {
    const expiresMs = Date.parse(expiresIso);
    if (!Number.isNaN(expiresMs) && expiresMs < nowMs) {
      return null;
    }
  }

  const areas = toArray(info.area) as Array<Record<string, unknown>>;
  const rings: Array<Array<[number, number]>> = [];
  for (const area of areas) {
    for (const polyRaw of toArray(area.polygon)) {
      const polyText = asText(polyRaw);
      if (polyText) {
        const ring = parseCapPolygon(polyText);
        if (ring.length >= 3) {
          rings.push(ring);
        }
      }
    }
  }

  const description = asText(info.description);
  const affectedKecamatan = matchAffectedMalangKecamatan(rings, description);
  if (affectedKecamatan.length === 0) {
    return null;
  }

  const identifier = asText(alertNode.identifier) || `cap-${Date.now()}`;
  const event = asText(info.event) || "Peringatan Dini Cuaca";
  const headline = asText(info.headline) || event;
  const effectiveIso = asText(info.effective);

  return {
    id: identifier,
    severity: mapCapSeverity(asText(info.severity)),
    event,
    headline,
    description,
    affectedKecamatan,
    effectiveWib: effectiveIso ? formatIsoToWibLabel(effectiveIso) : "Saat ini",
    expiresWib: expiresIso ? formatIsoToWibLabel(expiresIso) : "Hingga selesai",
    isFixtureSample: false,
  };
}

interface CachedAlertBundle {
  bundle: AlertBundle;
  fetchedAtMs: number;
}

let alertCache: CachedAlertBundle | null = null;
let inflightAlertBundle: Promise<AlertBundle> | null = null;

export function clearAlertCacheForTests(): void {
  alertCache = null;
  inflightAlertBundle = null;
}

/**
 * Ambil feed RSS peringatan dini BMKG, filter item Jawa Timur, lalu unduh dan cocokkan
 * poligon CAP 1.2 XML terhadap 41 kecamatan Malang Raya.
 */
export async function getLiveMalangAlerts(options?: {
  forceRefresh?: boolean;
}): Promise<AlertBundle> {
  const forceRefresh = Boolean(options?.forceRefresh);
  const now = Date.now();
  if (
    !forceRefresh &&
    alertCache &&
    now - alertCache.fetchedAtMs < ALERT_TTL_MS
  ) {
    return alertCache.bundle;
  }

  if (!forceRefresh && inflightAlertBundle) {
    return inflightAlertBundle;
  }

  const runFetch = (async (): Promise<AlertBundle> => {
    try {
      const rssUrl = `${getBmkgWebBaseUrl()}/alerts/nowcast/id/rss.xml`;
      const fetchOpts = forceRefresh
        ? { noStore: true }
        : { revalidateSeconds: 300 };
      const rssXml = await fetchBmkgText(rssUrl, fetchOpts);
      const allItems = parseRssNowcastXml(rssXml);
      const jatimItems = allItems.filter(isJawaTimurNowcastItem).slice(0, 4);

      let activeAlert: Alert | null = null;

      if (jatimItems.length > 0) {
        const capResults = await Promise.allSettled(
          jatimItems.map((item) => fetchBmkgText(item.link, fetchOpts)),
        );

        for (const res of capResults) {
          if (res.status !== "fulfilled") continue;
          const matched = parseCapAlertForMalangRaya(res.value);
          if (matched) {
            activeAlert = matched;
            break;
          }
        }
      }

      const checkedAtWib = formatNowWibTime();
      const bundle: AlertBundle = {
        activeAlert,
        allJatimCount: jatimItems.length,
        checkedAtWib,
        sourceLabel: activeAlert
          ? `Peringatan Dini CAP 1.2 BMKG · Pembaruan ${checkedAtWib}`
          : `Peringatan Dini CAP 1.2 BMKG · Tidak ada peringatan aktif di Malang Raya (${checkedAtWib})`,
        isStale: false,
        isFixtureSample: false,
      };

      alertCache = {
        bundle,
        fetchedAtMs: Date.now(),
      };
      return bundle;
    } catch (err) {
      if (alertCache) {
        return {
          ...alertCache.bundle,
          isStale: true,
          sourceLabel: `Menampilkan status peringatan terakhir pukul ${alertCache.bundle.checkedAtWib} (server peringatan BMKG sedang lambat)`,
        };
      }
      throw err;
    } finally {
      if (!forceRefresh) {
        inflightAlertBundle = null;
      }
    }
  })();

  if (!forceRefresh) {
    inflightAlertBundle = runFetch;
  }
  return runFetch;
}
