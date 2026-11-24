import { ImageResponse } from "next/og";

export const alt =
  "Tetep Siaga Reks: Peta Cuaca & Kesiapsiagaan Malang Raya berbasis data resmi BMKG";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background:
          "linear-gradient(135deg, #0b5394 0%, #146ca4 55%, #1d86b8 100%)",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: 18,
            background: "rgba(255,255,255,0.16)",
            border: "2px solid rgba(255,255,255,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 36 36"
            fill="none"
            role="img"
            aria-label="Emblem Tetep Siaga Reks"
          >
            <circle cx="25.5" cy="11.5" r="4" fill="#FDE047" />
            <path
              d="M8.5 14.5C8.5 12.8 9.9 11.5 11.6 11.5C12.2 10.1 13.6 9.2 15.2 9.2C17.3 9.2 19 10.9 19 13C19.8 13.3 20.4 14 20.4 14.9C20.4 16 19.5 16.8 18.4 16.8H10.5C9.4 16.8 8.5 15.8 8.5 14.5Z"
              fill="#E0F2FE"
            />
            <path
              d="M4.5 27.5L12.8 17.8L18.4 23.2L24.5 16.2L31.5 27.5H4.5Z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#bae6fd",
              letterSpacing: "0.04em",
            }}
          >
            DATA RESMI BMKG
          </span>
          <span style={{ fontSize: 34, fontWeight: 800 }}>
            Tetep Siaga Reks
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 960,
          }}
        >
          Peta Cuaca &amp; Kesiapsiagaan Malang Raya
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#e0f2fe",
            maxWidth: 920,
            lineHeight: 1.4,
          }}
        >
          Prakiraan cuaca per kelurahan, info gempa bumi TEWS, dan peringatan
          dini cuaca ekstrem CAP 1.2 untuk Kota Malang, Kab. Malang, dan Kota
          Batu.
        </div>
      </div>

      <div style={{ display: "flex", gap: 18 }}>
        {["41 Kecamatan", "471 Desa/Kelurahan", "Peta Interaktif 3D"].map(
          (item) => (
            <div
              key={item}
              style={{
                padding: "12px 22px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.16)",
                border: "1.5px solid rgba(255,255,255,0.3)",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {item}
            </div>
          ),
        )}
      </div>
    </div>,
    { ...size },
  );
}
