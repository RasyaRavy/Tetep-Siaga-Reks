import type { SkyCondition, SkyPeriod, SkyToken } from "@/types";

export function getSkyPeriodFromWibHour(wibHour: number): SkyPeriod {
  const h = ((wibHour % 24) + 24) % 24;
  if (h >= 5 && h <= 10) return "pagi";
  if (h >= 11 && h <= 14) return "siang";
  if (h >= 15 && h <= 17) return "senja";
  return "malam";
}

export function getSkyConditionFromWeatherCode(code: number): SkyCondition {
  if (code >= 95) return "badai";
  if (code >= 60) return "hujan";
  if (code === 0 || code === 1) return "cerah";
  return "berawan";
}

const PERIOD_LABELS: Record<SkyPeriod, string> = {
  pagi: "Pagi",
  siang: "Siang",
  senja: "Senja",
  malam: "Malam",
};

const CONDITION_LABELS: Record<SkyCondition, string> = {
  cerah: "Cerah",
  berawan: "Berawan",
  hujan: "Hujan",
  badai: "Badai Petir",
};

export function resolveSkyToken(
  wibHour: number,
  weatherCode: number,
): SkyToken {
  const period = getSkyPeriodFromWibHour(wibHour);
  const condition = getSkyConditionFromWeatherCode(weatherCode);
  return {
    period,
    condition,
    cssVar: `var(--sky-${period}-${condition})`,
    label: `${PERIOD_LABELS[period]} ${CONDITION_LABELS[condition]}`,
  };
}

export function resolveSkyPreset(preset: string | undefined): SkyToken | null {
  if (!preset) return null;
  const parts = preset.split("-");
  const period = parts[0] as SkyPeriod | undefined;
  const condition = parts[1] as SkyCondition | undefined;
  if (
    period &&
    condition &&
    period in PERIOD_LABELS &&
    condition in CONDITION_LABELS
  ) {
    return {
      period,
      condition,
      cssVar: `var(--sky-${period}-${condition})`,
      label: `${PERIOD_LABELS[period]} ${CONDITION_LABELS[condition]}`,
    };
  }
  return null;
}

export function getTempBandToken(tempC: number): {
  cssVar: string;
  label: string;
} {
  if (tempC < 20) return { cssVar: "var(--color-temp-cool)", label: "< 20°C" };
  if (tempC <= 23)
    return { cssVar: "var(--color-temp-fresh)", label: "20-23°C" };
  if (tempC <= 27)
    return { cssVar: "var(--color-temp-mild)", label: "24-27°C" };
  if (tempC <= 30)
    return { cssVar: "var(--color-temp-warm)", label: "28-30°C" };
  return { cssVar: "var(--color-temp-hot)", label: ">= 31°C" };
}
