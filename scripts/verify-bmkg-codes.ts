import { ALL_REGIONS, KECAMATAN_MAP } from "../src/lib/regions";

const USER_AGENT =
  "TetepSiagaReks/1.0 (+https://github.com/tetep-siaga-reks; data=BMKG)";

async function verifyCode(adm4: string): Promise<{
  adm4: string;
  ok: boolean;
  status: number;
  bmkgDesa?: string;
  bmkgKec?: string;
  weatherCode?: number;
}> {
  try {
    const res = await fetch(
      `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4)}`,
      {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      return { adm4, ok: false, status: res.status };
    }
    const json = (await res.json()) as {
      lokasi?: { desa?: string; kecamatan?: string };
      data?: Array<{ cuaca?: Array<Array<{ weather?: number }>> }>;
    };
    const slot = json.data?.[0]?.cuaca?.[0]?.[0];
    return {
      adm4,
      ok: Boolean(slot),
      status: res.status,
      bmkgDesa: json.lokasi?.desa,
      bmkgKec: json.lokasi?.kecamatan,
      weatherCode: slot?.weather,
    };
  } catch {
    return { adm4, ok: false, status: 0 };
  }
}

async function main() {
  const checkAll = process.argv.includes("--all");
  const targets = checkAll
    ? ALL_REGIONS.map((r) => r.adm4)
    : KECAMATAN_MAP.kecamatan.map((k) => k.defaultAdm4);

  console.log(
    `Verifying ${targets.length} BMKG adm4 codes (${checkAll ? "all 471 desa/kelurahan, rate-limited" : "41 kecamatan representatives"})...`,
  );

  const concurrency = 5;
  const delayBatchMs = checkAll ? 5200 : 350;
  let passed = 0;
  const failures: Array<{ adm4: string; status: number }> = [];
  const seenWeatherCodes = new Set<number>();

  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    const results = await Promise.all(batch.map((code) => verifyCode(code)));
    for (const r of results) {
      if (r.ok) {
        passed++;
        if (typeof r.weatherCode === "number") {
          seenWeatherCodes.add(r.weatherCode);
        }
      } else {
        failures.push({ adm4: r.adm4, status: r.status });
      }
    }
    if (i + concurrency < targets.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBatchMs));
    }
  }

  console.log(`Passed: ${passed}/${targets.length}`);
  console.log(
    `Observed weather codes: ${Array.from(seenWeatherCodes)
      .sort((a, b) => a - b)
      .join(", ")}`,
  );
  if (failures.length > 0) {
    console.error("Failures:", failures);
    process.exit(1);
  }
}

main();
