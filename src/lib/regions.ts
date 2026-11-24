import kecamatanData from "@/data/kecamatan-paths.json";
import malangGeoRaw from "@/data/malang-raya-geo.json";
import regionsData from "@/data/regions.json";
import {
  haversineKm,
  type LatLng,
  pointInGeoJsonMultiPolygon,
  pointInGeoJsonPolygon,
} from "@/lib/geo";
import type { KecamatanMapDataset, KecamatanShape, Region } from "@/types";

export const DEFAULT_ADM4 = "35.73.02.1001"; // Kel. Klojen, Kec. Klojen, Kota Malang

export const KECAMATAN_MAP: KecamatanMapDataset =
  kecamatanData as KecamatanMapDataset;

export const ALL_REGIONS: Region[] = regionsData as Region[];

const REGION_BY_ADM4 = new Map<string, Region>(
  ALL_REGIONS.map((r) => [r.adm4, r]),
);

const KECAMATAN_BY_ADM3 = new Map<string, KecamatanShape>(
  KECAMATAN_MAP.kecamatan.map((k) => [k.adm3, k]),
);

export function adm4ToSlug(adm4: string): string {
  return adm4.replaceAll(".", "-");
}

export function slugToAdm4(slug: string): string {
  return slug.replaceAll("-", ".");
}

export function getRegionByAdm4(adm4: string): Region | undefined {
  return REGION_BY_ADM4.get(adm4);
}

export function getDefaultRegion(): Region {
  const found = REGION_BY_ADM4.get(DEFAULT_ADM4);
  if (!found) {
    throw new Error(`Default region ${DEFAULT_ADM4} missing from regions.json`);
  }
  return found;
}

export function getKecamatanByAdm3(adm3: string): KecamatanShape | undefined {
  return KECAMATAN_BY_ADM3.get(adm3);
}

export function getRegionsInKecamatan(adm3: string): Region[] {
  return ALL_REGIONS.filter((r) => r.adm3 === adm3);
}

interface MalangGeoFeature {
  properties: { adm3: string; name: string };
  geometry:
    | { type: "Polygon"; coordinates: Array<Array<[number, number]>> }
    | {
        type: "MultiPolygon";
        coordinates: Array<Array<Array<[number, number]>>>;
      };
}

const MALANG_GEO_FEATURES: MalangGeoFeature[] = (
  malangGeoRaw as unknown as { features: MalangGeoFeature[] }
).features;

/**
 * Cek poligon mana di antara 41 kecamatan Malang Raya yang mengandung koordinat `coords`.
 */
export function findKecamatanContainingPoint(coords: LatLng): string | null {
  for (const feat of MALANG_GEO_FEATURES) {
    const geom = feat.geometry;
    if (
      geom.type === "MultiPolygon" &&
      pointInGeoJsonMultiPolygon(coords, geom.coordinates)
    ) {
      return feat.properties.adm3;
    }
    if (
      geom.type === "Polygon" &&
      pointInGeoJsonPolygon(coords, geom.coordinates)
    ) {
      return feat.properties.adm3;
    }
  }
  return null;
}

export function findNearestRegion(coords: LatLng): {
  region: Region;
  distanceKm: number;
  matchedByPolygon: boolean;
} {
  // 1. Prioritaskan point-in-polygon 41 kecamatan agar kecamatan tidak meleset di perbatasan
  const containingAdm3 = findKecamatanContainingPoint(coords);
  const candidates = containingAdm3
    ? getRegionsInKecamatan(containingAdm3)
    : ALL_REGIONS;
  const searchPool = candidates.length > 0 ? candidates : ALL_REGIONS;

  let nearest = getDefaultRegion();
  let minDistance = Number.POSITIVE_INFINITY;

  for (const r of searchPool) {
    const dist = haversineKm(coords, { lat: r.lat, lng: r.lng });
    if (dist < minDistance) {
      minDistance = dist;
      nearest = r;
    }
  }

  return {
    region: nearest,
    distanceKm: minDistance,
    matchedByPolygon: Boolean(containingAdm3),
  };
}
