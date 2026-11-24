import { NextResponse } from "next/server";
import { getLiveRegionForecast } from "@/lib/bmkg/forecast";
import { getRegionByAdm4, slugToAdm4 } from "@/lib/regions";

export const revalidate = 1800;

const CACHE_HEADER = "public, s-maxage=1800, stale-while-revalidate=86400";

export async function GET(
  _request: Request,
  context: { params: Promise<{ adm4: string }> },
) {
  const { adm4: rawParam } = await context.params;
  const normalizedAdm4 = rawParam.includes("-")
    ? slugToAdm4(rawParam)
    : rawParam;

  const region = getRegionByAdm4(normalizedAdm4);
  if (!region) {
    return NextResponse.json(
      {
        error: "WILAYAH_TIDAK_DITEMUKAN",
        message: `Kode wilayah "${rawParam}" tidak termasuk dalam 471 desa/kelurahan Malang Raya.`,
      },
      { status: 404 },
    );
  }

  try {
    const forecast = await getLiveRegionForecast(region);
    return NextResponse.json(
      { forecast },
      {
        status: 200,
        headers: {
          "Cache-Control": CACHE_HEADER,
        },
      },
    );
  } catch (err) {
    const detail =
      err instanceof Error ? err.message : "Gagal memuat prakiraan cuaca BMKG";
    return NextResponse.json(
      {
        error: "BMKG_TIDAK_TERJANGKAU",
        message:
          "Server prakiraan cuaca BMKG sedang tidak merespons. Silakan coba muat ulang beberapa saat lagi.",
        detail,
      },
      { status: 502 },
    );
  }
}
