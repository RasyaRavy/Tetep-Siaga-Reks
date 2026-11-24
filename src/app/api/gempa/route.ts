import { NextResponse } from "next/server";
import { getLiveQuakeBundle } from "@/lib/bmkg/quake";

const CACHE_HEADER = "public, s-maxage=300, stale-while-revalidate=3600";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "1";

  try {
    const bundle = await getLiveQuakeBundle({ forceRefresh });
    return NextResponse.json(bundle, {
      status: 200,
      headers: {
        "Cache-Control": forceRefresh ? "no-store" : CACHE_HEADER,
      },
    });
  } catch (err) {
    const detail =
      err instanceof Error
        ? err.message
        : "Gagal memuat data gempa bumi dari BMKG TEWS";
    return NextResponse.json(
      {
        error: "GEMPA_BMKG_TIDAK_TERJANGKAU",
        message:
          "Server info gempa BMKG TEWS sedang tidak merespons. Silakan coba muat ulang beberapa saat lagi.",
        detail,
      },
      { status: 502 },
    );
  }
}
