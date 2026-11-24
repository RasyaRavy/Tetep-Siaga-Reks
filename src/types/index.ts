export type ElevationTier = "dataran-tinggi" | "dataran-sedang" | "pesisir";

export interface Region {
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
}

export interface KecamatanBbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface KecamatanShape {
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
  bbox: KecamatanBbox;
  geoBbox: [number, number, number, number];
  path: string;
}

export interface KecamatanMapDataset {
  viewBox: { width: number; height: number };
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  kecamatan: KecamatanShape[];
}

export interface ForecastSlot {
  utcDatetime: string;
  wibDate: string; // YYYY-MM-DD
  wibTime: string; // HH:mm
  wibHour: number;
  tempC: number;
  humidityPct: number;
  rainMm: number;
  cloudCoverPct: number;
  windSpeedKmh: number;
  windDir: string;
  windDeg: number;
  weatherCode: number;
  weatherDesc: string;
  visibilityText: string | null;
}

export interface ForecastDay {
  date: string;
  dayLabel: string;
  minTempC: number;
  maxTempC: number;
  totalRainMm: number;
  dominantWeatherCode: number;
  dominantWeatherDesc: string;
  slots: ForecastSlot[];
}

export interface Forecast {
  region: Region;
  updatedAtWib: string;
  sourceLabel: string;
  isFixtureSample: boolean;
  isStale?: boolean;
  bmkgCoords?: { lat: number; lng: number };
  current: ForecastSlot;
  days: ForecastDay[];
}

export interface KecamatanWeatherSummary {
  adm3: string;
  tempC: number;
  weatherCode: number;
  weatherDesc: string;
  rainMm: number;
}

export interface Quake {
  id: string;
  dateTimeIso: string;
  wibLabel: string;
  lat: number;
  lng: number;
  magnitude: number;
  depthKm: number;
  regionDesc: string;
  potential: string | null;
  feltMmi: string | null;
  shakemapUrl: string | null;
}

export interface QuakeBundle {
  latest: Quake;
  recentM5: Quake[];
  felt: Quake[];
  updatedAtWib: string;
  sourceLabel: string;
  isStale: boolean;
  isFixtureSample: boolean;
}

export type AlertSeverity = "aman" | "waspada" | "bahaya";

export interface Alert {
  id: string;
  severity: AlertSeverity;
  event: string;
  headline: string;
  description: string;
  affectedKecamatan: string[];
  effectiveWib: string;
  expiresWib: string;
  isFixtureSample: boolean;
}

export interface AlertBundle {
  activeAlert: Alert | null;
  allJatimCount: number;
  checkedAtWib: string;
  sourceLabel: string;
  isStale: boolean;
  isFixtureSample: boolean;
}

export type SkyPeriod = "pagi" | "siang" | "senja" | "malam";
export type SkyCondition = "cerah" | "berawan" | "hujan" | "badai";

export interface SkyToken {
  period: SkyPeriod;
  condition: SkyCondition;
  cssVar: string;
  label: string;
}
