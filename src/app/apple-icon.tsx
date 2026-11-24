import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0b5394 0%, #1679ab 100%)",
        borderRadius: 36,
      }}
    >
      <svg
        width="132"
        height="132"
        viewBox="0 0 36 36"
        fill="none"
        role="img"
        aria-label="Logo Tetep Siaga Reks"
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
        <path
          d="M7 29.5H29"
          stroke="#38BDF8"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>,
    { ...size },
  );
}
