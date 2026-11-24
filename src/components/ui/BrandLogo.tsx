interface BrandLogoProps {
  size?: number;
  className?: string;
}

/**
 * Emblem resmi Tetep Siaga Reks: perisai kesiapsiagaan + siluet pegunungan Malang Raya + cahaya langit.
 */
export function BrandLogo({ size = 26, className = "" }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect width="36" height="36" rx="10" fill="#0B5394" />
      <rect
        x="1"
        y="1"
        width="34"
        height="34"
        rx="9"
        stroke="#7DD3FC"
        strokeOpacity="0.35"
        strokeWidth="1.2"
      />
      {/* Matahari dataran tinggi */}
      <circle cx="25.5" cy="11.5" r="4" fill="#FDE047" />
      {/* Awan tipis */}
      <path
        d="M8.5 14.5C8.5 12.8 9.9 11.5 11.6 11.5C12.2 10.1 13.6 9.2 15.2 9.2C17.3 9.2 19 10.9 19 13C19.8 13.3 20.4 14 20.4 14.9C20.4 16 19.5 16.8 18.4 16.8H10.5C9.4 16.8 8.5 15.8 8.5 14.5Z"
        fill="#E0F2FE"
      />
      {/* Siluet puncak gunung Malang Raya (Arjuno - Kawi - Semeru) */}
      <path
        d="M4.5 27.5L12.8 17.8L18.4 23.2L24.5 16.2L31.5 27.5H4.5Z"
        fill="#FFFFFF"
      />
      <path
        d="M4.5 27.5L12.8 17.8L16.2 21.1L11.5 27.5H4.5Z"
        fill="#BAE6FD"
        fillOpacity="0.7"
      />
      {/* Garis perisai / cakrawala bawah */}
      <path
        d="M7 29.5H29"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
