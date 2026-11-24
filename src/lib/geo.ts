export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return "< 1 km";
  if (km < 100) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km).toLocaleString("id-ID")} km`;
}

/**
 * Ray-casting point-in-polygon pada ring GeoJSON berformat `[lng, lat]`.
 */
export function pointInRing(
  point: LatLng,
  ring: ReadonlyArray<readonly [number, number]>,
): boolean {
  if (ring.length < 3) return false;
  const x = point.lng;
  const y = point.lat;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i];
    const pj = ring[j];
    if (!pi || !pj) continue;
    const xi = pi[0];
    const yi = pi[1];
    const xj = pj[0];
    const yj = pj[1];

    const intersects =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function pointInGeoJsonPolygon(
  point: LatLng,
  rings: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
): boolean {
  const outer = rings[0];
  if (!outer || !pointInRing(point, outer)) return false;
  for (let i = 1; i < rings.length; i++) {
    const hole = rings[i];
    if (hole && pointInRing(point, hole)) return false;
  }
  return true;
}

export function pointInGeoJsonMultiPolygon(
  point: LatLng,
  polygons: ReadonlyArray<
    ReadonlyArray<ReadonlyArray<readonly [number, number]>>
  >,
): boolean {
  for (const poly of polygons) {
    if (pointInGeoJsonPolygon(point, poly)) return true;
  }
  return false;
}

/**
 * Parse string poligon CAP 1.2 ("lat,lon lat,lon ...") menjadi ring `[lng, lat]`.
 */
export function parseCapPolygon(polygonText: string): Array<[number, number]> {
  const coords: Array<[number, number]> = [];
  for (const token of polygonText.trim().split(/\s+/)) {
    const [latStr, lngStr] = token.split(",");
    if (!latStr || !lngStr) continue;
    const lat = Number.parseFloat(latStr);
    const lng = Number.parseFloat(lngStr);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      coords.push([lng, lat]);
    }
  }
  return coords;
}
