"use client";

import type { SkyToken } from "@/types";

interface WeatherAtmosphereProps {
  sky: SkyToken;
  paused: boolean;
}

const CANOPY_GRADIENTS: Record<string, string> = {
  "pagi-cerah":
    "linear-gradient(180deg, rgba(14,116,184,0.46) 0%, rgba(56,189,248,0.22) 48%, rgba(255,255,255,0) 100%)",
  "pagi-berawan":
    "linear-gradient(180deg, rgba(51,101,138,0.42) 0%, rgba(148,184,209,0.22) 50%, rgba(255,255,255,0) 100%)",
  "pagi-hujan":
    "linear-gradient(180deg, rgba(30,58,82,0.56) 0%, rgba(71,105,135,0.28) 55%, rgba(255,255,255,0) 100%)",
  "siang-cerah":
    "linear-gradient(180deg, rgba(11,99,176,0.44) 0%, rgba(56,189,248,0.18) 46%, rgba(255,255,255,0) 100%)",
  "siang-berawan":
    "linear-gradient(180deg, rgba(56,95,122,0.40) 0%, rgba(148,179,199,0.20) 50%, rgba(255,255,255,0) 100%)",
  "siang-hujan":
    "linear-gradient(180deg, rgba(27,53,75,0.58) 0%, rgba(68,99,125,0.28) 55%, rgba(255,255,255,0) 100%)",
  "senja-cerah":
    "linear-gradient(180deg, rgba(180,83,9,0.44) 0%, rgba(251,146,60,0.22) 48%, rgba(255,255,255,0) 100%)",
  "senja-berawan":
    "linear-gradient(180deg, rgba(107,68,83,0.44) 0%, rgba(186,135,125,0.20) 50%, rgba(255,255,255,0) 100%)",
  "senja-hujan":
    "linear-gradient(180deg, rgba(34,51,68,0.56) 0%, rgba(79,102,125,0.26) 54%, rgba(255,255,255,0) 100%)",
  "malam-cerah":
    "linear-gradient(180deg, rgba(15,44,76,0.46) 0%, rgba(51,92,135,0.20) 50%, rgba(255,255,255,0) 100%)",
  "malam-berawan":
    "linear-gradient(180deg, rgba(30,52,72,0.48) 0%, rgba(79,107,130,0.22) 50%, rgba(255,255,255,0) 100%)",
  "malam-hujan":
    "linear-gradient(180deg, rgba(22,38,54,0.58) 0%, rgba(62,86,110,0.28) 55%, rgba(255,255,255,0) 100%)",
  "pagi-badai":
    "linear-gradient(180deg, rgba(20,33,54,0.68) 0%, rgba(49,69,99,0.34) 58%, rgba(255,255,255,0) 100%)",
  "siang-badai":
    "linear-gradient(180deg, rgba(18,31,51,0.70) 0%, rgba(45,64,94,0.34) 58%, rgba(255,255,255,0) 100%)",
  "senja-badai":
    "linear-gradient(180deg, rgba(24,30,48,0.70) 0%, rgba(56,64,90,0.34) 58%, rgba(255,255,255,0) 100%)",
  "malam-badai":
    "linear-gradient(180deg, rgba(13,22,36,0.74) 0%, rgba(36,52,77,0.36) 58%, rgba(255,255,255,0) 100%)",
};

const RAIN_STRIPS = [
  { left: "8%", delay: "0s" },
  { left: "16%", delay: "0.35s" },
  { left: "25%", delay: "0.8s" },
  { left: "34%", delay: "0.15s" },
  { left: "44%", delay: "0.6s" },
  { left: "53%", delay: "0.95s" },
  { left: "62%", delay: "0.25s" },
  { left: "72%", delay: "0.7s" },
  { left: "81%", delay: "0.45s" },
  { left: "90%", delay: "1.05s" },
];

export function WeatherAtmosphere({ sky, paused }: WeatherAtmosphereProps) {
  const key = `${sky.period}-${sky.condition}`;
  const canopy = CANOPY_GRADIENTS[key] ?? CANOPY_GRADIENTS["pagi-cerah"];
  const isSunny = sky.condition === "cerah";
  const isStorm = sky.condition === "badai";
  const isRainy = sky.condition === "hujan" || isStorm;
  const isSenja = sky.period === "senja";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-10 h-60 overflow-hidden select-none ${
        paused ? "motion-paused" : ""
      }`}
      style={{ background: canopy }}
    >
      {/* Sun / Sunset atmospheric glow */}
      {(isSunny || isSenja) && (
        <div
          className="atmo-sun-glow absolute -top-20 right-[14%] h-64 w-64 rounded-full"
          style={{
            background: isSenja
              ? "radial-gradient(circle, rgba(251,146,60,0.55) 0%, rgba(251,146,60,0) 70%)"
              : "radial-gradient(circle, rgba(254,240,138,0.62) 0%, rgba(186,230,253,0) 70%)",
          }}
        />
      )}

      {/* Drifting highland cloud layer 1 */}
      <svg
        viewBox="0 0 1440 220"
        fill="none"
        aria-hidden="true"
        className="atmo-cloud-1 absolute top-2 left-0 h-44 w-[112%] opacity-75"
      >
        <path
          d="M110 88c28-26 78-28 108-4 22-16 58-12 74 10 26 2 44 22 40 42H78c-14-18 2-46 32-48Z"
          fill="rgba(255,255,255,0.55)"
        />
        <path
          d="M620 62c34-30 94-30 128-2 28-18 68-12 86 14 30 4 50 26 44 48H582c-16-22 4-54 38-60Z"
          fill="rgba(255,255,255,0.48)"
        />
        <path
          d="M1130 78c26-22 72-24 98-4 20-14 52-10 66 10 24 2 40 20 36 38h-230c-12-16 2-42 30-44Z"
          fill="rgba(255,255,255,0.52)"
        />
      </svg>

      {/* Drifting highland mist layer 2 */}
      <svg
        viewBox="0 0 1440 220"
        fill="none"
        aria-hidden="true"
        className="atmo-cloud-2 absolute top-8 -left-[6%] h-48 w-[112%] opacity-55"
      >
        <path
          d="M340 96c32-24 84-24 114 0 24-14 58-8 74 12 24 4 40 22 36 40H306c-14-18 4-48 34-52Z"
          fill="rgba(255,255,255,0.45)"
        />
        <path
          d="M920 86c30-24 82-26 112-2 22-14 56-10 72 10 24 4 42 22 36 42H886c-14-18 4-46 34-50Z"
          fill="rgba(255,255,255,0.42)"
        />
      </svg>

      {/* Subtle atmospheric lightning flash when condition is badai */}
      {isStorm && (
        <div
          className="atmo-lightning absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 65% 15%, rgba(224,242,254,0.78) 0%, rgba(186,230,253,0.18) 45%, rgba(255,255,255,0) 75%)",
          }}
        />
      )}

      {/* Falling rain streaks when condition is hujan or badai */}
      {isRainy &&
        RAIN_STRIPS.map((drop) => (
          <span
            key={drop.left}
            style={{ left: drop.left, animationDelay: drop.delay }}
            className="atmo-rain-drop absolute top-4 h-11 w-[1.5px] rotate-[16deg] rounded-full bg-gradient-to-b from-white/0 via-sky-100/85 to-white/0"
          />
        ))}
    </div>
  );
}
