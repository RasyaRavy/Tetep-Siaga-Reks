import { NextResponse } from "next/server";
import { BMKG_USER_AGENT, getBmkgDataBaseUrl } from "@/lib/bmkg/client";

const VALID_FILENAME = /^[A-Za-z0-9._-]+\.(jpg|jpeg|png)$/i;

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  if (!VALID_FILENAME.test(file)) {
    return NextResponse.json(
      { error: "NAMA_BERKAS_TIDAK_VALID" },
      { status: 400 },
    );
  }

  try {
    const upstreamUrl = `${getBmkgDataBaseUrl()}/DataMKG/TEWS/${encodeURIComponent(file)}`;
    const res = await fetch(upstreamUrl, {
      headers: {
        "User-Agent": BMKG_USER_AGENT,
        Accept: "image/*",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "SHAKEMAP_TIDAK_DITEMUKAN" },
        { status: res.status === 404 ? 404 : 502 },
      );
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "SHAKEMAP_BUKAN_GAMBAR" },
        { status: 502 },
      );
    }

    const bytes = await res.arrayBuffer();
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "SHAKEMAP_GAGAL_DIMUAT" },
      { status: 502 },
    );
  }
}
