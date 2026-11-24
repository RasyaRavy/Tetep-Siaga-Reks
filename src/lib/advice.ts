import type { ElevationTier, ForecastSlot } from "@/types";

export interface DryWindowResult {
  hasDryWindow: boolean;
  label: string;
  detail: string;
}

function isDrySlot(slot: ForecastSlot): boolean {
  return slot.rainMm <= 0.1 && slot.weatherCode < 60;
}

function formatHourRange(startHour: number, endHour: number): string {
  const fmt = (h: number) => `${String(h % 24).padStart(2, "0")}.00`;
  return `${fmt(startHour)} - ${fmt(endHour)} WIB`;
}

/**
 * R2: Hitung jendela kering terpanjang hari ini dari slot prakiraan per 3 jam.
 */
export function computeDryWindow(todaySlots: ForecastSlot[]): DryWindowResult {
  if (todaySlots.length === 0) {
    return {
      hasDryWindow: false,
      label: "Data jendela kering belum tersedia",
      detail: "Prakiraan per 3 jam hari ini belum dimuat.",
    };
  }

  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;

  for (let i = 0; i < todaySlots.length; i++) {
    const slot = todaySlots[i];
    if (slot && isDrySlot(slot)) {
      if (curStart === -1) curStart = i;
      curLen++;
      if (curLen > bestLen) {
        bestStart = curStart;
        bestLen = curLen;
      }
    } else {
      curStart = -1;
      curLen = 0;
    }
  }

  if (bestStart === -1 || bestLen === 0) {
    return {
      hasDryWindow: false,
      label: "Berpotensi hujan sepanjang sisa hari",
      detail: "Siapkan jas hujan atau payung sebelum keluar rumah.",
    };
  }

  const startSlot = todaySlots[bestStart];
  const endSlot = todaySlots[bestStart + bestLen - 1];
  if (!startSlot || !endSlot) {
    return {
      hasDryWindow: false,
      label: "Berpotensi hujan sepanjang sisa hari",
      detail: "Siapkan jas hujan atau payung sebelum keluar rumah.",
    };
  }

  const range = formatHourRange(startSlot.wibHour, endSlot.wibHour + 3);
  return {
    hasDryWindow: true,
    label: `Paling aman keluar: ${range}`,
    detail: `Curah hujan rendah pada ${bestLen} rentang waktu berturut-turut.`,
  };
}

/**
 * R6: Kalimat saran sederhana yang sadar ketinggian (Batu/Pujon vs Kota Malang vs Pesisir).
 */
export function buildLocalAdvice(
  current: ForecastSlot,
  elevationTier: ElevationTier,
  kecamatanName: string,
): string {
  const parts: string[] = [];

  if (current.weatherCode >= 60 || current.rainMm >= 1) {
    parts.push("Bawa jas hujan atau payung, jalanan berpotensi licin.");
  } else if (current.windSpeedKmh >= 20) {
    parts.push(
      "Angin bertiup cukup kencang, waspada dahan pohon saat berkendara.",
    );
  }

  if (elevationTier === "dataran-tinggi") {
    if (current.tempC <= 18) {
      parts.push(
        `Suhu ${current.tempC}°C di ${kecamatanName} terasa cukup menggigit, pakai jaket tebal.`,
      );
    } else if (current.tempC <= 22) {
      parts.push(
        `Udara sejuk khas dataran tinggi ${kecamatanName}, jaket tipis sudah cukup nyaman.`,
      );
    } else {
      parts.push(`Cuaca relatif hangat untuk kawasan ${kecamatanName}.`);
    }
  } else if (elevationTier === "pesisir") {
    if (current.tempC >= 31) {
      parts.push(
        `Terik di pesisir ${kecamatanName}, cukupi minum air dan hindari paparan matahari terlalu lama.`,
      );
    } else {
      parts.push(
        `Suhu pesisir ${kecamatanName} tergolong nyaman untuk aktivitas luar.`,
      );
    }
  } else {
    if (current.tempC <= 21) {
      parts.push(
        `Lebih dingin dari biasanya untuk ${kecamatanName}, siapkan jaket bila keluar malam.`,
      );
    } else if (current.tempC >= 31) {
      parts.push(`Siang terasa terik di ${kecamatanName}, jaga asupan cairan.`);
    } else if (parts.length === 0) {
      parts.push(
        `Kondisi ${kecamatanName} tergolong nyaman untuk beraktivitas.`,
      );
    }
  }

  return parts.join(" ");
}
