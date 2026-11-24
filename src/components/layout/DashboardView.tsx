import { MapWorkspace } from "@/components/map/MapWorkspace";
import { getLiveMalangAlerts } from "@/lib/bmkg/alerts";
import {
  formatNowWibTime,
  getLiveKecamatanSummaries,
  getLiveRegionForecast,
} from "@/lib/bmkg/forecast";
import { getLiveQuakeBundle } from "@/lib/bmkg/quake";
import { getDefaultRegion } from "@/lib/regions";
import {
  getStage1Forecast,
  getStage1KecamatanSummaries,
  getStage1Quakes,
} from "@/lib/stage1-data";
import type { AlertBundle, QuakeBundle } from "@/types";

export async function DashboardView() {
  const defaultRegion = getDefaultRegion();

  const [summaryResult, defaultForecastResult, quakeResult, alertResult] =
    await Promise.allSettled([
      getLiveKecamatanSummaries(),
      getLiveRegionForecast(defaultRegion),
      getLiveQuakeBundle(),
      getLiveMalangAlerts(),
    ]);

  const summaries =
    summaryResult.status === "fulfilled"
      ? summaryResult.value.summaries
      : getStage1KecamatanSummaries();

  const summariesFromFallback = summaryResult.status !== "fulfilled";

  const initialDefaultForecast =
    defaultForecastResult.status === "fulfilled"
      ? defaultForecastResult.value
      : {
          ...getStage1Forecast(defaultRegion),
          isStale: true,
          sourceLabel:
            "Cadangan lokal sementara (menunggu sambungan ke server BMKG)",
        };

  let quakes: QuakeBundle;
  if (quakeResult.status === "fulfilled") {
    quakes = quakeResult.value;
  } else {
    const fallbackQuakes = getStage1Quakes();
    quakes = {
      ...fallbackQuakes,
      updatedAtWib: "Cadangan lokal",
      sourceLabel:
        "Cadangan lokal sementara (menunggu sambungan ke server BMKG TEWS)",
      isStale: true,
      isFixtureSample: true,
    };
  }

  const alertBundle: AlertBundle =
    alertResult.status === "fulfilled"
      ? alertResult.value
      : {
          activeAlert: null,
          allJatimCount: 0,
          checkedAtWib: formatNowWibTime(),
          sourceLabel:
            "Status peringatan dini CAP 1.2 BMKG belum dapat dimuat saat ini",
          isStale: true,
          isFixtureSample: false,
        };

  return (
    <MapWorkspace
      summaries={summaries}
      initialDefaultForecast={initialDefaultForecast}
      summariesFromFallback={summariesFromFallback}
      quakes={quakes}
      alertBundle={alertBundle}
    />
  );
}
