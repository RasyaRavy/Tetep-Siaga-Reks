import type {
  Alert,
  ElevationTier,
  Forecast,
  ForecastDay,
  ForecastSlot,
  KecamatanWeatherSummary,
  Quake,
  Region,
} from "@/types";
import autoGempaRaw from "../../tests/fixtures/autogempa.json";
import gempaDirasakanRaw from "../../tests/fixtures/gempadirasakan.json";
import gempaTerkiniRaw from "../../tests/fixtures/gempaterkini.json";
import prakiraanRaw from "../../tests/fixtures/prakiraan-35.73.03.1001.json";
import { KECAMATAN_MAP } from "./regions";

interface RawBmkgSlot {
  utc_datetime: string;
  t: number;
  hu: number;
  tp: number;
  tcc: number;
  ws: number;
  wd: string;
  wd_deg: number;
  weather: number;
  weather_desc: string;
  vs_text: string | null;
}

interface RawBmkgForecast {
  data: Array<{
    cuaca: RawBmkgSlot[][];
  }>;
}

interface RawBmkgQuake {
  Tanggal: string;
  Jam: string;
  DateTime: string;
  Coordinates: string;
  Magnitude: string;
  Kedalaman: string;
  Wilayah: string;
  Potensi?: string;
  Dirasakan?: string;
  Shakemap?: string;
}

const DAY_NAMES_ID = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const MONTH_NAMES_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function utcToWibParts(utcDatetime: string): {
  wibDate: string;
  wibTime: string;
  wibHour: number;
  dayLabel: string;
} {
  const iso = utcDatetime.includes("T")
    ? utcDatetime
    : `${utcDatetime.replace(" ", "T")}Z`;
  const ms = Date.parse(iso) + 7 * 60 * 60 * 1000;
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  const hour = d.getUTCHours();
  const minute = d.getUTCHours() >= 0 ? d.getUTCMinutes() : 0;

  const wibDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const wibTime = `${String(hour).padStart(2, "0")}.${String(minute).padStart(2, "0")}`;
  const dayName = DAY_NAMES_ID[d.getUTCDay()] ?? "";
  const monthName = MONTH_NAMES_ID[month] ?? "";

  return {
    wibDate,
    wibTime,
    wibHour: hour,
    dayLabel: `${dayName}, ${day} ${monthName}`,
  };
}

function getElevationTempOffset(tier: ElevationTier, adm3: string): number {
  const hash =
    adm3.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 3;
  if (tier === "dataran-tinggi") {
    return -6 + (hash - 1);
  }
  if (tier === "pesisir") {
    return 1 + (hash === 2 ? 1 : 0);
  }
  return hash - 1;
}

function resolveKecamatanCondition(
  tier: ElevationTier,
  tempC: number,
  adm3: string,
): { weatherCode: number; weatherDesc: string; rainMm: number } {
  const seed =
    adm3.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 4;

  if (tier === "dataran-tinggi") {
    if (seed === 0) {
      return { weatherCode: 10, weatherDesc: "Udara Kabur", rainMm: 0.2 };
    }
    if (tempC <= 23) {
      return { weatherCode: 61, weatherDesc: "Hujan Ringan", rainMm: 1.6 };
    }
    return { weatherCode: 3, weatherDesc: "Berawan", rainMm: 0 };
  }

  if (tier === "pesisir") {
    if (tempC >= 30) {
      return { weatherCode: 1, weatherDesc: "Cerah", rainMm: 0 };
    }
    return { weatherCode: 2, weatherDesc: "Cerah Berawan", rainMm: 0 };
  }

  if (tempC >= 30) {
    return { weatherCode: 2, weatherDesc: "Cerah Berawan", rainMm: 0 };
  }
  if (seed === 1) {
    return { weatherCode: 61, weatherDesc: "Hujan Ringan", rainMm: 1.6 };
  }
  return { weatherCode: 3, weatherDesc: "Berawan", rainMm: 0 };
}

const FORECAST_RAW = prakiraanRaw as unknown as RawBmkgForecast;

export function getStage1Forecast(region: Region): Forecast {
  const rawDays = FORECAST_RAW.data[0]?.cuaca ?? [];
  const tempOffset = getElevationTempOffset(region.elevationTier, region.adm3);
  const baseFirstTemp = rawDays[0]?.[0]?.t ?? 28;
  const heroTemp = Math.max(
    14,
    Math.min(36, Math.round(baseFirstTemp + tempOffset)),
  );
  const regionNowCond = resolveKecamatanCondition(
    region.elevationTier,
    heroTemp,
    region.adm3,
  );

  const days: ForecastDay[] = rawDays.map((rawSlots, dayIdx) => {
    const slots: ForecastSlot[] = rawSlots.map((s, slotIdx) => {
      const wib = utcToWibParts(s.utc_datetime);
      const slotTemp = Math.max(14, Math.min(36, Math.round(s.t + tempOffset)));
      const isCurrentSlot = dayIdx === 0 && slotIdx === 0;
      const weatherCode = isCurrentSlot ? regionNowCond.weatherCode : s.weather;
      const weatherDesc = isCurrentSlot
        ? regionNowCond.weatherDesc
        : s.weather_desc;
      const rainMm = isCurrentSlot ? regionNowCond.rainMm : s.tp;

      return {
        utcDatetime: s.utc_datetime,
        wibDate: wib.wibDate,
        wibTime: wib.wibTime,
        wibHour: wib.wibHour,
        tempC: slotTemp,
        humidityPct: s.hu,
        rainMm,
        cloudCoverPct: s.tcc,
        windSpeedKmh: s.ws,
        windDir: s.wd,
        windDeg: s.wd_deg,
        weatherCode,
        weatherDesc,
        visibilityText: s.vs_text,
      };
    });

    const first = slots[0];
    const temps = slots.map((s) => s.tempC);
    const totalRain = Number(
      slots.reduce((acc, s) => acc + s.rainMm, 0).toFixed(1),
    );
    const rainiest =
      slots.find((s) => s.weatherCode >= 60) ??
      slots[Math.floor(slots.length / 2)] ??
      first;

    const wibFirst = first
      ? utcToWibParts(first.utcDatetime)
      : { wibDate: "", dayLabel: `Hari ${dayIdx + 1}` };

    return {
      date: wibFirst.wibDate,
      dayLabel:
        dayIdx === 0 ? "Hari ini" : dayIdx === 1 ? "Besok" : wibFirst.dayLabel,
      minTempC: temps.length > 0 ? Math.min(...temps) : 0,
      maxTempC: temps.length > 0 ? Math.max(...temps) : 0,
      totalRainMm: totalRain,
      dominantWeatherCode: rainiest?.weatherCode ?? 3,
      dominantWeatherDesc: rainiest?.weatherDesc ?? "Berawan",
      slots,
    };
  });

  const current = days[0]?.slots[0];
  if (!current) {
    throw new Error("Fixture forecast has no slots");
  }

  return {
    region,
    updatedAtWib: `${current.wibTime} WIB`,
    sourceLabel: "Simulasi Tahap 1 menggunakan rekaman respons asli BMKG",
    isFixtureSample: true,
    current,
    days,
  };
}

const CACHED_SUMMARIES: KecamatanWeatherSummary[] = (() => {
  const baseSlot = FORECAST_RAW.data[0]?.cuaca[0]?.[0];
  const baseTemp = baseSlot?.t ?? 28;

  return KECAMATAN_MAP.kecamatan.map((k) => {
    const offset = getElevationTempOffset(k.elevationTier, k.adm3);
    const tempC = Math.max(15, Math.min(35, Math.round(baseTemp + offset)));
    const cond = resolveKecamatanCondition(k.elevationTier, tempC, k.adm3);
    return {
      adm3: k.adm3,
      tempC,
      weatherCode: cond.weatherCode,
      weatherDesc: cond.weatherDesc,
      rainMm: cond.rainMm,
    };
  });
})();

export function getStage1KecamatanSummaries(): KecamatanWeatherSummary[] {
  return CACHED_SUMMARIES;
}

function parseQuakeItem(raw: RawBmkgQuake, idx: number): Quake {
  const [latStr, lngStr] = raw.Coordinates.split(",");
  const depthNum = Number.parseFloat(raw.Kedalaman.replace(/[^\d.]/g, "")) || 0;
  return {
    id: `${raw.DateTime}-${idx}`,
    dateTimeIso: raw.DateTime,
    wibLabel: `${raw.Tanggal}, ${raw.Jam}`,
    lat: Number.parseFloat(latStr ?? "0"),
    lng: Number.parseFloat(lngStr ?? "0"),
    magnitude: Number.parseFloat(raw.Magnitude) || 0,
    depthKm: depthNum,
    regionDesc: raw.Wilayah,
    potential: raw.Potensi ?? null,
    feltMmi: raw.Dirasakan && raw.Dirasakan !== "-" ? raw.Dirasakan : null,
    shakemapUrl: raw.Shakemap
      ? `https://data.bmkg.go.id/DataMKG/TEWS/${raw.Shakemap}`
      : null,
  };
}

const CACHED_QUAKES = (() => {
  const auto = autoGempaRaw as { Infogempa: { gempa: RawBmkgQuake } };
  const terkini = gempaTerkiniRaw as { Infogempa: { gempa: RawBmkgQuake[] } };
  const dirasakan = gempaDirasakanRaw as {
    Infogempa: { gempa: RawBmkgQuake[] };
  };

  return {
    latest: parseQuakeItem(auto.Infogempa.gempa, 0),
    recentM5: terkini.Infogempa.gempa
      .slice(0, 5)
      .map((q, i) => parseQuakeItem(q, i + 1)),
    felt: dirasakan.Infogempa.gempa
      .slice(0, 5)
      .map((q, i) => parseQuakeItem(q, i + 100)),
  };
})();

export function getStage1Quakes(): {
  latest: Quake;
  recentM5: Quake[];
  felt: Quake[];
} {
  return CACHED_QUAKES;
}

const SAMPLE_ALERT: Alert = {
  id: "sample-cap-malang-raya-1",
  severity: "waspada",
  event: "Hujan Sedang hingga Lebat disertai Angin Kencang",
  headline: "Potensi Hujan Lebat & Angin Kencang Lereng Malang Raya",
  description:
    "Berpotensi terjadi hujan sedang hingga lebat disertai kilat dan angin kencang sesaat di kawasan lereng dan dataran tinggi. Waspadai genangan lintasan dan jarak pandang berkurang.",
  affectedKecamatan: ["Batu", "Bumiaji", "Pujon", "Dau", "Karangploso"],
  effectiveWib: "13.00 WIB",
  expiresWib: "16.00 WIB",
  isFixtureSample: true,
};

export function getStage1SampleAlert(): Alert {
  return SAMPLE_ALERT;
}
