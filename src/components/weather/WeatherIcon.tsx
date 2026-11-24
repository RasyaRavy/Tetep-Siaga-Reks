interface WeatherIconProps {
  code: number;
  size?: number;
  variant?: "default" | "hero";
  className?: string;
}

/**
 * Ikon cuaca SVG animasi bergaya meteorologi yang menyesuaikan kode cuaca BMKG.
 * `variant="hero"` memakai palet putih-es & sian terang agar sangat kontras di atas kartu langit gelap.
 */
export function WeatherIcon({
  code,
  size = 32,
  variant = "default",
  className = "",
}: WeatherIconProps) {
  const isHero = variant === "hero";
  const cloudMain = isHero ? "#FFFFFF" : "#E2E8F0";
  const cloudStroke = isHero ? "#BAE6FD" : "#475569";
  const cloudBack = isHero ? "rgba(224, 242, 254, 0.78)" : "#94A3B8";
  const rainColor = isHero ? "#7DD3FC" : "#0284C7";
  const sunFill = isHero ? "#FDE047" : "#F59E0B";
  const sunStroke = isHero ? "#FEF08A" : "#D97706";
  const mistStroke = isHero ? "#E0F2FE" : "#64748B";

  // Cerah (0, 1): Matahari berputar halus
  if (code === 0 || code === 1) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <g
          className="wx-spin"
          stroke={sunStroke}
          strokeWidth="2.8"
          strokeLinecap="round"
        >
          <line x1="24" y1="5" x2="24" y2="10" />
          <line x1="24" y1="38" x2="24" y2="43" />
          <line x1="5" y1="24" x2="10" y2="24" />
          <line x1="38" y1="24" x2="43" y2="24" />
          <line x1="10.6" y1="10.6" x2="14.1" y2="14.1" />
          <line x1="33.9" y1="33.9" x2="37.4" y2="37.4" />
          <line x1="37.4" y1="10.6" x2="33.9" y2="14.1" />
          <line x1="14.1" y1="33.9" x2="10.6" y2="37.4" />
        </g>
        <circle
          cx="24"
          cy="24"
          r="9.5"
          fill={sunFill}
          stroke={sunStroke}
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  // Cerah Berawan (2): Sinar matahari berputar + awan mengambang lembut
  if (code === 2) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <g
          className="wx-spin"
          stroke={sunStroke}
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <line x1="17" y1="6" x2="17" y2="9.5" />
          <line x1="6" y1="17" x2="9.5" y2="17" />
          <line x1="9.2" y1="9.2" x2="11.8" y2="11.8" />
          <line x1="24.8" y1="9.2" x2="22.2" y2="11.8" />
        </g>
        <circle cx="17" cy="17" r="7" fill={sunFill} />
        <path
          d="M15 36h20a7 7 0 0 0 1.1-13.9A9.5 9.5 0 0 0 17.5 19a6.5 6.5 0 0 0-2.5 17Z"
          fill={cloudMain}
          stroke={cloudStroke}
          strokeWidth="1.8"
          className="wx-float"
        />
      </svg>
    );
  }

  // Udara Kabur / Asap / Kabut (5, 10, 45): Awan + pita kabut bergeser
  if (code === 5 || code === 10 || code === 45) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <path
          d="M14 27h20a6 6 0 0 0 1-11.9A8.5 8.5 0 0 0 18.5 13.5 6 6 0 0 0 14 27Z"
          fill={cloudMain}
          stroke={cloudStroke}
          strokeWidth="1.8"
          className="wx-float"
        />
        <g
          className="wx-mist"
          stroke={mistStroke}
          strokeWidth="2.6"
          strokeLinecap="round"
        >
          <line x1="10" y1="33" x2="38" y2="33" />
          <line x1="14" y1="39" x2="34" y2="39" />
        </g>
      </svg>
    );
  }

  // Hujan Petir (95, 97): Awan + kilat berkedip + tetes hujan
  if (code >= 95) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <path
          d="M13 27.5h21a6.5 6.5 0 0 0 1.1-12.9A9 9 0 0 0 17.5 13 6.5 6.5 0 0 0 13 27.5Z"
          fill={cloudMain}
          stroke={cloudStroke}
          strokeWidth="1.8"
          className="wx-float"
        />
        <line
          x1="16"
          y1="32"
          x2="14"
          y2="39"
          stroke={rainColor}
          strokeWidth="2.6"
          strokeLinecap="round"
          className="wx-drop-1"
        />
        <line
          x1="33"
          y1="32"
          x2="31"
          y2="39"
          stroke={rainColor}
          strokeWidth="2.6"
          strokeLinecap="round"
          className="wx-drop-2"
        />
        <path
          d="M25 26.5l-4.2 8h4.2l-2 7.5 8.2-10.5h-4.5l2.3-5h-4Z"
          fill={sunFill}
          className="wx-flash"
        />
      </svg>
    );
  }

  // Hujan Ringan / Sedang / Lebat (60-80): Awan terang kontras tinggi + 3 tetes hujan bergerak
  if (code >= 60) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <path
          d="M13 28h21a6.5 6.5 0 0 0 1.1-12.9A9 9 0 0 0 17.5 13.5 6.5 6.5 0 0 0 13 28Z"
          fill={cloudMain}
          stroke={cloudStroke}
          strokeWidth="1.8"
          className="wx-float"
        />
        <g stroke={rainColor} strokeWidth="2.8" strokeLinecap="round">
          <line x1="17.5" y1="32.5" x2="15.5" y2="40" className="wx-drop-1" />
          <line x1="24.5" y1="32.5" x2="22.5" y2="41" className="wx-drop-2" />
          <line x1="31.5" y1="32.5" x2="29.5" y2="40" className="wx-drop-3" />
        </g>
      </svg>
    );
  }

  // Default: Berawan (3, 4) dengan dua lapis awan berarak halus
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M19 25h16a5 5 0 0 0 .8-9.9A7 7 0 0 0 22 13.5 5 5 0 0 0 19 25Z"
        fill={cloudBack}
        className="wx-float-alt"
      />
      <path
        d="M12 35h22a7 7 0 0 0 1.2-13.9A9.5 9.5 0 0 0 16.5 19.5 6.5 6.5 0 0 0 12 35Z"
        fill={cloudMain}
        stroke={cloudStroke}
        strokeWidth="1.8"
        className="wx-float"
      />
    </svg>
  );
}
