import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  isJawaTimurNowcastItem,
  mapCapSeverity,
  parseCapAlertForMalangRaya,
  parseRssNowcastXml,
} from "@/lib/bmkg/alerts";
import { findKecamatanContainingPoint, findNearestRegion } from "@/lib/regions";
import { resolveSkyPreset, resolveSkyToken } from "@/lib/sky";

const fixturesDir = path.join(process.cwd(), "tests", "fixtures");
const realRssXml = readFileSync(path.join(fixturesDir, "rss.xml"), "utf-8");
const realCapPapuaXml = readFileSync(
  path.join(fixturesDir, "cap-sample.xml"),
  "utf-8",
);

describe("lib/bmkg/alerts RSS & CAP 1.2 XML parser", () => {
  it("parses real BMKG nowcast RSS feed and maps CAP severity levels", () => {
    const items = parseRssNowcastXml(realRssXml);
    expect(items.length).toBeGreaterThan(3);
    expect(items[0]?.title).toContain("Papua");
    expect(items[0]?.link).toContain("_alert.xml");

    expect(
      isJawaTimurNowcastItem({
        title: "Hujan Lebat disertai Petir di Jawa Timur",
        link: "https://www.bmkg.go.id/alerts/nowcast/id/CJI20261124001_alert.xml",
        description: "Sebagian wilayah Malang dan Batu",
        guid: "1",
        pubDate: "",
      }),
    ).toBe(true);
    const firstItem = items[0];
    expect(firstItem).toBeDefined();
    if (firstItem) {
      expect(isJawaTimurNowcastItem(firstItem)).toBe(false);
    }

    expect(mapCapSeverity("Extreme")).toBe("bahaya");
    expect(mapCapSeverity("Severe")).toBe("bahaya");
    expect(mapCapSeverity("Moderate")).toBe("waspada");
    expect(mapCapSeverity("Minor")).toBe("aman");
  });

  it("ignores non-Malang CAP alerts (real Papua fixture returns null)", () => {
    const fixedNow = Date.parse("2026-11-24T02:30:00Z");
    const result = parseCapAlertForMalangRaya(realCapPapuaXml, fixedNow);
    expect(result).toBeNull();
  });

  it("matches Malang Raya kecamatan polygons and names in a Jawa Timur CAP 1.2 XML alert", () => {
    const malangCapXml = `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>2.49.0.1.360.0.2026.11.24.35.001</identifier>
  <info>
    <language>id</language>
    <event>Hujan Lebat dan Petir</event>
    <severity>Moderate</severity>
    <effective>2026-11-24T19:00:00+07:00</effective>
    <expires>2026-11-24T21:30:00+07:00</expires>
    <headline>Hujan Lebat disertai Petir di Jawa Timur</headline>
    <description>Hujan lebat disertai petir berpotensi terjadi di wilayah Jawa Timur, khususnya di KLOJEN, BATU, PUJON.</description>
    <area>
      <areaDesc>Jawa Timur</areaDesc>
      <polygon>-7.95,112.60 -7.95,112.66 -8.01,112.66 -8.01,112.60 -7.95,112.60</polygon>
    </area>
  </info>
</alert>`;

    const fixedNow = Date.parse("2026-11-24T12:15:00Z"); // 19:15 WIB
    const alert = parseCapAlertForMalangRaya(malangCapXml, fixedNow);
    expect(alert).not.toBeNull();
    expect(alert?.isFixtureSample).toBe(false);
    expect(alert?.severity).toBe("waspada");
    expect(alert?.affectedKecamatan).toContain("Klojen");
    expect(alert?.affectedKecamatan).toContain("Batu");
    expect(alert?.affectedKecamatan).toContain("Pujon");
    expect(alert?.effectiveWib).toBe("19.00 WIB");
    expect(alert?.expiresWib).toBe("21.30 WIB");
  });
});

describe("Point-in-polygon geolocation & Badai Petir sky token", () => {
  it("matches coordinates inside Malang Raya kecamatan polygons accurately", () => {
    const klojenAdm3 = findKecamatanContainingPoint({
      lat: -7.977,
      lng: 112.634,
    });
    expect(klojenAdm3).toBe("35.73.02");

    const nearKlojen = findNearestRegion({ lat: -7.977, lng: 112.634 });
    expect(nearKlojen.matchedByPolygon).toBe(true);
    expect(nearKlojen.region.adm3).toBe("35.73.02");

    const outsideMalang = findNearestRegion({ lat: -6.2, lng: 106.8 });
    expect(outsideMalang.matchedByPolygon).toBe(false);
    expect(outsideMalang.distanceKm).toBeGreaterThan(500);
  });

  it("resolves thunderstorm weather codes (95/97) and preset to badai condition", () => {
    const storm = resolveSkyToken(14, 95);
    expect(storm.condition).toBe("badai");
    expect(storm.label).toBe("Siang Badai Petir");

    const preset = resolveSkyPreset("siang-badai");
    expect(preset?.condition).toBe("badai");
  });
});
