import fs from "node:fs";
import path from "node:path";

type LatLng = [number, number];
type LngLat = [number, number];
type Point = [number, number];
type ElevationTier = "dataran-tinggi" | "dataran-sedang" | "pesisir";

interface RawKecamatan {
  adm3: string;
  adm2: string;
  name: string;
  kotkab: string;
  lat: number;
  lng: number;
  rings: LatLng[][];
  elevationTier: ElevationTier;
}

const HIGHLAND_ADM3 = new Set([
  "35.79.01", // Batu
  "35.79.02", // Bumiaji
  "35.79.03", // Junrejo
  "35.07.26", // Pujon
  "35.07.27", // Ngantang
  "35.07.28", // Kasembon
  "35.07.07", // Poncokusumo
  "35.07.17", // Jabung
  "35.07.16", // Tumpang
  "35.07.23", // Karangploso
  "35.07.24", // Singosari
  "35.07.25", // Lawang
  "35.07.22", // Dau
]);

const COASTAL_ADM3 = new Set([
  "35.07.01", // Donomulyo
  "35.07.03", // Bantur
  "35.07.04", // Sumbermanjing Wetan
  "35.07.06", // Ampelgading
  "35.07.29", // Gedangan
  "35.07.30", // Tirtoyudo
]);

function getKotkab(adm2: string): string {
  if (adm2 === "35.73") return "Kota Malang";
  if (adm2 === "35.79") return "Kota Batu";
  return "Kab. Malang";
}

function getElevationTier(adm3: string): ElevationTier {
  if (HIGHLAND_ADM3.has(adm3)) return "dataran-tinggi";
  if (COASTAL_ADM3.has(adm3)) return "pesisir";
  return "dataran-sedang";
}

function extractRings(raw: unknown): LatLng[][] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0];
  if (
    Array.isArray(first) &&
    first.length === 2 &&
    typeof first[0] === "number" &&
    typeof first[1] === "number"
  ) {
    return [raw as LatLng[]];
  }
  const rings: LatLng[][] = [];
  for (const item of raw) {
    rings.push(...extractRings(item));
  }
  return rings;
}

function parseKecSql(sql: string): RawKecamatan[] {
  const rowRegex =
    /\('(35\.(?:07|73|79)\.\d{2})','([^']+)',(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),'(\[[^\n']+\])'\)/g;
  const results: RawKecamatan[] = [];

  for (const match of sql.matchAll(rowRegex)) {
    const adm3 = match[1];
    const name = match[2];
    const lat = Number(match[3]);
    const lng = Number(match[4]);
    const rawPath = match[5];
    if (!adm3 || !name || !rawPath) continue;

    const parsed = JSON.parse(rawPath) as unknown;
    const rings = extractRings(parsed).filter((ring) => ring.length >= 3);
    const adm2 = adm3.slice(0, 5);
    results.push({
      adm3,
      adm2,
      name,
      kotkab: getKotkab(adm2),
      lat,
      lng,
      rings,
      elevationTier: getElevationTier(adm3),
    });
  }

  return results.sort((a, b) => a.adm3.localeCompare(b.adm3));
}

function pointInRing(pt: Point, ring: Point[]): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i];
    const pj = ring[j];
    if (!pi || !pj) continue;
    const xi = pi[0];
    const yi = pi[1];
    const xj = pj[0];
    const yj = pj[1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInRings(pt: Point, rings: Point[][]): boolean {
  return rings.some((ring) => pointInRing(pt, ring));
}

function simplifyRing(points: Point[], tolerance: number): Point[] {
  if (points.length <= 4) return points;
  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];
  if (!start || !end) return points;

  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lenSq = dx * dx + dy * dy;

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    if (!p) continue;
    let dist: number;
    if (lenSq === 0) {
      dist = Math.hypot(p[0] - start[0], p[1] - start[1]);
    } else {
      const t = Math.max(
        0,
        Math.min(1, ((p[0] - start[0]) * dx + (p[1] - start[1]) * dy) / lenSq),
      );
      dist = Math.hypot(p[0] - (start[0] + t * dx), p[1] - (start[1] + t * dy));
    }
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyRing(points.slice(0, index + 1), tolerance);
    const right = simplifyRing(points.slice(index), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round5(n: number): number {
  return Math.round(n * 100000) / 100000;
}

function parseWilayahDesa(
  sql: string,
): Array<{ adm4: string; adm3: string; name: string }> {
  const regex = /\('(35\.(?:07|73|79)\.\d{2}\.\d{4})','([^']+)'\)/g;
  const items: Array<{ adm4: string; adm3: string; name: string }> = [];
  for (const match of sql.matchAll(regex)) {
    const adm4 = match[1];
    const name = match[2];
    if (!adm4 || !name) continue;
    items.push({
      adm4,
      adm3: adm4.slice(0, 8),
      name,
    });
  }
  return items.sort((a, b) => a.adm4.localeCompare(b.adm4));
}

function closeGeoRing(ring: LngLat[]): LngLat[] {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    return [...ring, first];
  }
  return ring;
}

function main() {
  const root = process.cwd();
  const kecSqlPath = path.join(root, "tests/fixtures/kec35.sql");
  const wilayahSqlPath = path.join(root, "tests/fixtures/wilayah-malang.sql");

  const kecSql = fs.readFileSync(kecSqlPath, "utf-8");
  const wilayahSql = fs.readFileSync(wilayahSqlPath, "utf-8");

  const kecamatans = parseKecSql(kecSql);
  const desas = parseWilayahDesa(wilayahSql);

  if (kecamatans.length !== 41) {
    throw new Error(`Expected 41 kecamatan, got ${kecamatans.length}`);
  }
  if (desas.length !== 471) {
    throw new Error(`Expected 471 desa/kelurahan, got ${desas.length}`);
  }

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  for (const k of kecamatans) {
    for (const ring of k.rings) {
      for (const [lat, lng] of ring) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      }
    }
  }

  const avgLatRad = (((minLat + maxLat) / 2) * Math.PI) / 180;
  const cosLat = Math.cos(avgLatRad);

  const geoWidth = (maxLng - minLng) * cosLat;
  const geoHeight = maxLat - minLat;

  const pad = 24;
  const targetWidth = 760;
  const innerWidth = targetWidth - pad * 2;
  const scale = innerWidth / geoWidth;
  const targetHeight = Math.round(geoHeight * scale + pad * 2);

  const project = (lat: number, lng: number): Point => [
    round1(pad + (lng - minLng) * cosLat * scale),
    round1(pad + (maxLat - lat) * scale),
  ];

  const desaByAdm3 = new Map<
    string,
    Array<{ adm4: string; adm3: string; name: string }>
  >();
  for (const d of desas) {
    const list = desaByAdm3.get(d.adm3) ?? [];
    list.push(d);
    desaByAdm3.set(d.adm3, list);
  }

  const kecamatanOutputs: Array<{
    adm3: string;
    adm2: string;
    name: string;
    kotkab: string;
    lat: number;
    lng: number;
    elevationTier: ElevationTier;
    defaultAdm4: string;
    desaCount: number;
    cx: number;
    cy: number;
    bbox: { x: number; y: number; width: number; height: number };
    geoBbox: [number, number, number, number];
    path: string;
  }> = [];

  const regionOutputs: Array<{
    adm4: string;
    adm3: string;
    adm2: string;
    desa: string;
    kecamatan: string;
    kotkab: string;
    elevationTier: ElevationTier;
    lat: number;
    lng: number;
    sx: number;
    sy: number;
  }> = [];

  const geoFeatures: Array<{
    type: "Feature";
    id: number;
    properties: {
      adm3: string;
      adm2: string;
      name: string;
      kotkab: string;
      elevationTier: ElevationTier;
      defaultAdm4: string;
      desaCount: number;
      centerLng: number;
      centerLat: number;
    };
    geometry: {
      type: "MultiPolygon";
      coordinates: LngLat[][][];
    };
  }> = [];

  kecamatans.forEach((k, featureIdx) => {
    let kMinLat = Number.POSITIVE_INFINITY;
    let kMaxLat = Number.NEGATIVE_INFINITY;
    let kMinLng = Number.POSITIVE_INFINITY;
    let kMaxLng = Number.NEGATIVE_INFINITY;

    const geoPolys: LngLat[][][] = k.rings.map((ring) => {
      const lngLatRing: LngLat[] = ring.map(([lat, lng]) => {
        if (lat < kMinLat) kMinLat = lat;
        if (lat > kMaxLat) kMaxLat = lat;
        if (lng < kMinLng) kMinLng = lng;
        if (lng > kMaxLng) kMaxLng = lng;
        return [round5(lng), round5(lat)];
      });
      return [closeGeoRing(lngLatRing)];
    });

    const projectedRings: Point[][] = k.rings.map((ring) => {
      const pts = ring.map(([lat, lng]) => project(lat, lng));
      return simplifyRing(pts, 0.14);
    });

    let bMinX = Number.POSITIVE_INFINITY;
    let bMaxX = Number.NEGATIVE_INFINITY;
    let bMinY = Number.POSITIVE_INFINITY;
    let bMaxY = Number.NEGATIVE_INFINITY;

    const pathParts: string[] = [];
    for (const ring of projectedRings) {
      if (ring.length < 3) continue;
      for (const [x, y] of ring) {
        if (x < bMinX) bMinX = x;
        if (x > bMaxX) bMaxX = x;
        if (y < bMinY) bMinY = y;
        if (y > bMaxY) bMaxY = y;
      }
      const cmds = ring
        .map(([x, y], idx) => `${idx === 0 ? "M" : "L"}${x} ${y}`)
        .join(" ");
      pathParts.push(`${cmds} Z`);
    }

    const [cx, cy] = project(k.lat, k.lng);
    const list = desaByAdm3.get(k.adm3) ?? [];
    const defaultAdm4 = list[0]?.adm4 ?? `${k.adm3}.1001`;
    const geoBbox: [number, number, number, number] = [
      round5(kMinLng),
      round5(kMinLat),
      round5(kMaxLng),
      round5(kMaxLat),
    ];

    kecamatanOutputs.push({
      adm3: k.adm3,
      adm2: k.adm2,
      name: k.name,
      kotkab: k.kotkab,
      lat: round5(k.lat),
      lng: round5(k.lng),
      elevationTier: k.elevationTier,
      defaultAdm4,
      desaCount: list.length,
      cx,
      cy,
      bbox: {
        x: round1(bMinX),
        y: round1(bMinY),
        width: round1(bMaxX - bMinX),
        height: round1(bMaxY - bMinY),
      },
      geoBbox,
      path: pathParts.join(" "),
    });

    geoFeatures.push({
      type: "Feature",
      id: featureIdx + 1,
      properties: {
        adm3: k.adm3,
        adm2: k.adm2,
        name: k.name,
        kotkab: k.kotkab,
        elevationTier: k.elevationTier,
        defaultAdm4,
        desaCount: list.length,
        centerLng: round5(k.lng),
        centerLat: round5(k.lat),
      },
      geometry: {
        type: "MultiPolygon",
        coordinates: geoPolys,
      },
    });

    const spanX = Math.max(4, (bMaxX - bMinX) * 0.42);
    const spanY = Math.max(4, (bMaxY - bMinY) * 0.42);
    const goldenAngle = 2.399963229728653;

    list.forEach((d, idx) => {
      let sx = cx;
      let sy = cy;
      if (idx > 0) {
        const ratio = Math.sqrt(idx / Math.max(1, list.length));
        const angle = idx * goldenAngle;
        const candX = round1(cx + Math.cos(angle) * spanX * ratio);
        const candY = round1(cy + Math.sin(angle) * spanY * ratio);
        if (pointInRings([candX, candY], projectedRings)) {
          sx = candX;
          sy = candY;
        } else {
          for (let shrink = 0.7; shrink >= 0.15; shrink -= 0.15) {
            const tx = round1(cx + (candX - cx) * shrink);
            const ty = round1(cy + (candY - cy) * shrink);
            if (pointInRings([tx, ty], projectedRings)) {
              sx = tx;
              sy = ty;
              break;
            }
          }
        }
      }

      const dLat = round5(maxLat - (sy - pad) / scale);
      const dLng = round5(minLng + (sx - pad) / (scale * cosLat));

      regionOutputs.push({
        adm4: d.adm4,
        adm3: k.adm3,
        adm2: k.adm2,
        desa: d.name,
        kecamatan: k.name,
        kotkab: k.kotkab,
        elevationTier: k.elevationTier,
        lat: dLat,
        lng: dLng,
        sx,
        sy,
      });
    });
  });

  const outDir = path.join(root, "src/data");
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, "kecamatan-paths.json"),
    JSON.stringify(
      {
        viewBox: { width: targetWidth, height: targetHeight },
        bounds: {
          minLat: round5(minLat),
          maxLat: round5(maxLat),
          minLng: round5(minLng),
          maxLng: round5(maxLng),
        },
        kecamatan: kecamatanOutputs,
      },
      null,
      2,
    ),
  );

  fs.writeFileSync(
    path.join(outDir, "malang-raya-geo.json"),
    JSON.stringify({
      type: "FeatureCollection",
      features: geoFeatures,
    }),
  );

  fs.writeFileSync(
    path.join(outDir, "regions.json"),
    JSON.stringify(regionOutputs, null, 2),
  );

  console.log(
    `Generated ${kecamatanOutputs.length} kecamatan GeoJSON + SVG and ${regionOutputs.length} regions.`,
  );
}

main();
