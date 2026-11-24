import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BMKG_USER_AGENT,
  BmkgFetchError,
  fetchBmkgJson,
} from "@/lib/bmkg/client";
import {
  clearForecastCacheForTests,
  getLiveRegionForecast,
  parseBmkgForecastResponse,
  utcStringToWib,
} from "@/lib/bmkg/forecast";
import {
  findNearestRegion,
  getDefaultRegion,
  getRegionByAdm4,
} from "@/lib/regions";
import prakiraanFixture from "./fixtures/prakiraan-35.73.03.1001.json";

afterEach(() => {
  clearForecastCacheForTests();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("lib/bmkg/forecast parser & Zod schema", () => {
  it("converts UTC datetime strings accurately to WIB (+07:00) regardless of timezone format", () => {
    const morning = utcStringToWib("2026-11-24 03:00:00");
    expect(morning.wibDate).toBe("2026-11-24");
    expect(morning.wibTime).toBe("10.00");
    expect(morning.wibHour).toBe(10);

    const rollover = utcStringToWib("2026-11-24T18:00:00Z");
    expect(rollover.wibDate).toBe("2026-11-25");
    expect(rollover.wibTime).toBe("01.00");
    expect(rollover.wibHour).toBe(1);
  });

  it("parses real BMKG fixture with non-full first day (5 slots) and null visibility", () => {
    const kotalama = getRegionByAdm4("35.73.03.1001") ?? getDefaultRegion();
    const fixedNow = Date.parse("2026-11-24T03:15:00Z"); // 10:15 WIB

    const forecast = parseBmkgForecastResponse(prakiraanFixture, kotalama, {
      nowMs: fixedNow,
      updatedAtWib: "10.15 WIB",
    });

    expect(forecast.isFixtureSample).toBe(false);
    expect(forecast.isStale).toBe(false);
    expect(forecast.days).toHaveLength(3);
    expect(forecast.days[0]?.slots).toHaveLength(5);
    expect(forecast.days[1]?.slots).toHaveLength(8);
    expect(forecast.current.tempC).toBe(30);
    expect(forecast.current.weatherCode).toBe(61);
    expect(forecast.current.weatherDesc).toBe("Hujan Ringan");
    expect(forecast.current.visibilityText).toBeNull();
    expect(forecast.bmkgCoords?.lat).toBeCloseTo(-7.9929, 3);
    expect(forecast.bmkgCoords?.lng).toBeCloseTo(112.6391, 3);
  });

  it("marks stale cache responses clearly in sourceLabel", () => {
    const region = getDefaultRegion();
    const forecast = parseBmkgForecastResponse(prakiraanFixture, region, {
      isStale: true,
      updatedAtWib: "13.45 WIB",
    });
    expect(forecast.isStale).toBe(true);
    expect(forecast.sourceLabel).toContain("13.45 WIB");
  });

  it("rejects malformed non-BMKG payloads via Zod", () => {
    const region = getDefaultRegion();
    expect(() =>
      parseBmkgForecastResponse({ invalid: true }, region),
    ).toThrow();
  });
});

describe("lib/bmkg/client & live cache / fallback behavior", () => {
  it("sends explicit non-Mozilla User-Agent and retries once on HTTP 503", async () => {
    expect(BMKG_USER_AGENT).not.toContain("Mozilla/5.0");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("Service Unavailable", { status: 503 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const data = await fetchBmkgJson<{ ok: boolean }>(
      "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=35.73.02.1001",
    );

    expect(data.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstCallInit = fetchMock.mock.calls[0]?.[1] as
      | RequestInit
      | undefined;
    const headers = firstCallInit?.headers as
      | Record<string, string>
      | undefined;
    expect(headers?.["User-Agent"]).toBe(BMKG_USER_AGENT);
  });

  it("rejects unexpected text/html responses with BmkgFetchError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<html><body>Not JSON</body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchBmkgJson(
        "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm3=35.73.02",
        {
          retries: 0,
        },
      ),
    ).rejects.toBeInstanceOf(BmkgFetchError);
  });

  it("falls back to parent kecamatan defaultAdm4 if a specific village adm4 returns 404", async () => {
    const nonDefaultVillage = getRegionByAdm4("35.73.02.1002");
    expect(nonDefaultVillage).toBeDefined();
    if (!nonDefaultVillage) return;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Not Found", { status: 404 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(prakiraanFixture), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const forecast = await getLiveRegionForecast(nonDefaultVillage);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(forecast.region.adm4).toBe("35.73.02.1002");
    expect(forecast.sourceLabel).toContain("Titik terdekat Kec. Klojen");
  });

  it("serves stale cached forecast honestly when TTL expires and BMKG is temporarily down", async () => {
    const region = getDefaultRegion();
    const baseTime = 1_795_500_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(baseTime);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(prakiraanFixture), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValue(new Response("Gateway Timeout", { status: 504 }));
    vi.stubGlobal("fetch", fetchMock);

    const fresh = await getLiveRegionForecast(region);
    expect(fresh.isStale).toBe(false);

    // Advance 35 minutes past 30-minute TTL
    nowSpy.mockReturnValue(baseTime + 35 * 60 * 1000);

    const stale = await getLiveRegionForecast(region);
    expect(stale.isStale).toBe(true);
    expect(stale.sourceLabel).toContain("Menampilkan data terakhir pukul");
  });
});

describe("findNearestRegion (client geolocation haversine)", () => {
  it("maps Kota Malang and Kota Batu coordinates to their nearest Malang Raya kelurahan", () => {
    const nearAlunAlunMalang = findNearestRegion({
      lat: -7.9826,
      lng: 112.6308,
    });
    expect(nearAlunAlunMalang.region.kotkab).toBe("Kota Malang");
    expect(nearAlunAlunMalang.distanceKm).toBeLessThan(3);

    const nearAlunAlunBatu = findNearestRegion({
      lat: -7.8712,
      lng: 112.5269,
    });
    expect(nearAlunAlunBatu.region.kotkab).toBe("Kota Batu");
    expect(nearAlunAlunBatu.distanceKm).toBeLessThan(3);
  });
});
