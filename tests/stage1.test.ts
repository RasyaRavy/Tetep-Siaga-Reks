import { describe, expect, it } from "vitest";
import { buildLocalAdvice, computeDryWindow } from "@/lib/advice";
import { formatDistanceKm, haversineKm } from "@/lib/geo";
import {
  ALL_REGIONS,
  DEFAULT_ADM4,
  getDefaultRegion,
  getRegionByAdm4,
  KECAMATAN_MAP,
} from "@/lib/regions";
import { resolveSkyPreset, resolveSkyToken } from "@/lib/sky";
import {
  getStage1Forecast,
  getStage1KecamatanSummaries,
  getStage1Quakes,
} from "@/lib/stage1-data";
import type { ForecastSlot } from "@/types";

describe("regions & kecamatan dataset integrity", () => {
  it("contains exactly 471 unique Malang Raya desa/kelurahan", () => {
    expect(ALL_REGIONS).toHaveLength(471);
    const uniqueAdm4 = new Set(ALL_REGIONS.map((r) => r.adm4));
    expect(uniqueAdm4.size).toBe(471);
    for (const r of ALL_REGIONS) {
      expect(r.adm4).toMatch(/^35\.(07|73|79)\.\d{2}\.\d{4}$/);
    }
  });

  it("has expected counts per kab/kota (Kab 390, Kota Malang 57, Kota Batu 24)", () => {
    const kab = ALL_REGIONS.filter((r) => r.adm2 === "35.07");
    const malang = ALL_REGIONS.filter((r) => r.adm2 === "35.73");
    const batu = ALL_REGIONS.filter((r) => r.adm2 === "35.79");
    expect(kab).toHaveLength(390);
    expect(malang).toHaveLength(57);
    expect(batu).toHaveLength(24);
  });

  it("maps default adm4 35.73.02.1001 to Kel. Klojen, Kec. Klojen", () => {
    const def = getDefaultRegion();
    expect(def.adm4).toBe(DEFAULT_ADM4);
    expect(def.desa).toBe("Klojen");
    expect(def.kecamatan).toBe("Klojen");
    expect(def.kotkab).toBe("Kota Malang");
  });

  it("contains exactly 41 kecamatan SVG polygons with valid paths and bboxes", () => {
    expect(KECAMATAN_MAP.kecamatan).toHaveLength(41);
    for (const k of KECAMATAN_MAP.kecamatan) {
      expect(k.path.startsWith("M")).toBe(true);
      expect(k.bbox.width).toBeGreaterThan(0);
      expect(k.bbox.height).toBeGreaterThan(0);
    }
  });
});

describe("advice.ts (R2 dry window & R6 height-aware advice)", () => {
  const makeSlot = (
    wibHour: number,
    rainMm: number,
    weatherCode: number,
    tempC = 25,
  ): ForecastSlot => ({
    utcDatetime: `2026-11-24 ${String((wibHour - 7 + 24) % 24).padStart(2, "0")}:00:00`,
    wibDate: "2026-11-24",
    wibTime: `${String(wibHour).padStart(2, "0")}.00`,
    wibHour,
    tempC,
    humidityPct: 75,
    rainMm,
    cloudCoverPct: 60,
    windSpeedKmh: 8,
    windDir: "SW",
    windDeg: 225,
    weatherCode,
    weatherDesc: weatherCode >= 60 ? "Hujan Ringan" : "Berawan",
    visibilityText: null,
  });

  it("finds longest consecutive dry window in today slots", () => {
    const slots = [
      makeSlot(7, 0, 2),
      makeSlot(10, 0, 3),
      makeSlot(13, 2.2, 61),
      makeSlot(16, 0, 3),
    ];
    const result = computeDryWindow(slots);
    expect(result.hasDryWindow).toBe(true);
    expect(result.label).toContain("07.00 - 13.00 WIB");
  });

  it("distinguishes Batu highland coolness from Kota Malang", () => {
    const coolSlot = makeSlot(19, 0, 3, 20);
    const batuAdvice = buildLocalAdvice(coolSlot, "dataran-tinggi", "Batu");
    const klojenAdvice = buildLocalAdvice(coolSlot, "dataran-sedang", "Klojen");
    expect(batuAdvice).toContain("dataran tinggi");
    expect(klojenAdvice).toContain("Lebih dingin dari biasanya");
  });
});

describe("sky.ts & geo.ts", () => {
  it("resolves WIB hour + weather code into contextual sky token", () => {
    expect(resolveSkyToken(8, 1).cssVar).toBe("var(--sky-pagi-cerah)");
    expect(resolveSkyToken(13, 61).cssVar).toBe("var(--sky-siang-hujan)");
    expect(resolveSkyToken(20, 3).cssVar).toBe("var(--sky-malam-berawan)");
    expect(resolveSkyPreset("senja-cerah")?.label).toBe("Senja Cerah");
  });

  it("computes realistic haversine distance between Klojen and Batu", () => {
    const klojen = getRegionByAdm4("35.73.02.1001");
    const batu = getRegionByAdm4("35.79.01.1001");
    expect(klojen).toBeDefined();
    expect(batu).toBeDefined();
    if (klojen && batu) {
      const km = haversineKm(klojen, batu);
      expect(km).toBeGreaterThan(10);
      expect(km).toBeLessThan(25);
      expect(formatDistanceKm(km)).toContain("km");
    }
  });
});

describe("stage1 BMKG fixture adapter", () => {
  it("parses real BMKG forecast fixture with non-full day 1 and null visibility", () => {
    const forecast = getStage1Forecast(getDefaultRegion());
    expect(forecast.days).toHaveLength(3);
    expect(forecast.days[0]?.slots).toHaveLength(5);
    expect(forecast.current.visibilityText).toBeNull();
  });

  it("produces summaries for all 41 kecamatan and parses quake fixtures", () => {
    expect(getStage1KecamatanSummaries()).toHaveLength(41);
    const quakes = getStage1Quakes();
    expect(quakes.latest.magnitude).toBeGreaterThan(0);
    expect(quakes.recentM5.length).toBeGreaterThan(0);
    expect(quakes.felt.length).toBeGreaterThan(0);
  });
});
