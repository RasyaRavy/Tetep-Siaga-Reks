import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearQuakeCacheForTests,
  getLiveQuakeBundle,
  parseAutoGempaResponse,
  parseBmkgCoordinates,
  parseBmkgDepthKm,
  parseGempaListResponse,
} from "@/lib/bmkg/quake";
import autogempaFixture from "./fixtures/autogempa.json";
import gempadirasakanFixture from "./fixtures/gempadirasakan.json";
import gempaterkiniFixture from "./fixtures/gempaterkini.json";

afterEach(() => {
  clearQuakeCacheForTests();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("lib/bmkg/quake TEWS parser & Zod schemas", () => {
  it("parses coordinates and depth strings cleanly and rejects invalid coordinates", () => {
    expect(parseBmkgCoordinates("-8.17,120.54")).toEqual({
      lat: -8.17,
      lng: 120.54,
    });
    expect(parseBmkgDepthKm("141 km")).toBe(141);
    expect(() => parseBmkgCoordinates("bukan-koordinat")).toThrow();
  });

  it("parses real autogempa fixture with string Magnitude/Kedalaman, '-' feltMmi -> null, and Shakemap proxy URL", () => {
    const quake = parseAutoGempaResponse(autogempaFixture);
    expect(quake.magnitude).toBe(5.3);
    expect(quake.depthKm).toBe(10);
    expect(quake.lat).toBeCloseTo(1.44, 2);
    expect(quake.lng).toBeCloseTo(131.96, 2);
    expect(quake.potential).toBe("Tidak berpotensi tsunami");
    expect(quake.feltMmi).toBeNull();
    expect(quake.shakemapUrl).toBe(
      "/api/gempa/shakemap/20261123182716.mmi.jpg",
    );
  });

  it("parses real gempaterkini (15 M5+) and gempadirasakan (15 felt MMI) fixtures", () => {
    const m5 = parseGempaListResponse(gempaterkiniFixture);
    expect(m5).toHaveLength(15);
    expect(m5[0]?.potential).toBe("Tidak berpotensi tsunami");
    expect(m5[0]?.shakemapUrl).toBeNull();

    const felt = parseGempaListResponse(gempadirasakanFixture);
    expect(felt).toHaveLength(15);
    expect(felt[0]?.feltMmi).toBe("II Tahuna");
    expect(felt[0]?.potential).toBeNull();
  });
});

describe("getLiveQuakeBundle parallel fetch, TTL cache & stale fallback", () => {
  it("fetches all 3 TEWS endpoints in parallel, caches for 5 minutes, and serves stale cache if TEWS fails later", async () => {
    const baseTime = 1_795_520_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(baseTime);

    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("autogempa.json")) {
        return new Response(JSON.stringify(autogempaFixture), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("gempaterkini.json")) {
        return new Response(JSON.stringify(gempaterkiniFixture), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("gempadirasakan.json")) {
        return new Response(JSON.stringify(gempadirasakanFixture), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("Not Found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await getLiveQuakeBundle();
    expect(first.isFixtureSample).toBe(false);
    expect(first.isStale).toBe(false);
    expect(first.latest.magnitude).toBe(5.3);
    expect(first.recentM5).toHaveLength(15);
    expect(first.felt).toHaveLength(15);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Within 5-minute TTL -> served from cache without additional network calls
    nowSpy.mockReturnValue(baseTime + 2 * 60 * 1000);
    const cached = await getLiveQuakeBundle();
    expect(cached.latest.id).toBe(first.latest.id);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Advance 6 minutes past TTL and simulate BMKG TEWS outage -> serves stale cache honestly
    nowSpy.mockReturnValue(baseTime + 6 * 60 * 1000);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })),
    );

    const stale = await getLiveQuakeBundle();
    expect(stale.isStale).toBe(true);
    expect(stale.sourceLabel).toContain("Menampilkan data gempa terakhir");
  });
});
