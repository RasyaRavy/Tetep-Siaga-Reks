import { NextResponse } from "next/server";
import { getLiveMalangAlerts } from "@/lib/bmkg/alerts";

const CACHE_HEADER = "public, s-maxage=300, stale-while-revalidate=3600";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "1";

  try {
    const bundle = await getLiveMalangAlerts({ forceRefresh });
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
        : "Gagal memuat peringatan dini cuaca dari BMKG";
    return NextResponse.json(
      {
        error: "PERINGATAN_BMKG_TIDAK_TERJANGKAU",
        message:
          "Server peringatan dini cuaca BMKG sedang tidak merespons. Coba muat ulang beberapa saat lagi.",
        detail,
      },
      { status: 502 },
    );
  }
}
