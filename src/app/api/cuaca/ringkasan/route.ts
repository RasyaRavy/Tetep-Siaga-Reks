import { NextResponse } from "next/server";
import { getLiveKecamatanSummaries } from "@/lib/bmkg/forecast";

export const revalidate = 1800;

const CACHE_HEADER = "public, s-maxage=1800, stale-while-revalidate=86400";

export async function GET() {
  try {
    const result = await getLiveKecamatanSummaries();
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": CACHE_HEADER,
      },
    });
  } catch (err) {
    const detail =
      err instanceof Error
        ? err.message
        : "Gagal memuat ringkasan cuaca kecamatan";
    return NextResponse.json(
      {
        error: "BMKG_RINGKASAN_GAGAL",
        message:
          "Ringkasan suhu 41 kecamatan belum dapat dimuat dari BMKG saat ini.",
        detail,
      },
      { status: 502 },
    );
  }
}
