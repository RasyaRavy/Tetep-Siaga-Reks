import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "@/styles/globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "http://localhost:3100";

export const viewport: Viewport = {
  themeColor: "#0b5394",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tetep Siaga Reks | Peta Cuaca & Kesiapsiagaan Malang Raya",
    template: "%s",
  },
  description:
    "Peta cuaca interaktif 41 kecamatan dan 471 desa/kelurahan, info gempa bumi TEWS, serta peringatan dini cuaca ekstrem CAP 1.2 untuk Kota Malang, Kabupaten Malang, dan Kota Batu berbasis data resmi BMKG.",
  applicationName: "Tetep Siaga Reks",
  keywords: [
    "cuaca Malang Raya",
    "BMKG Malang",
    "cuaca Kota Malang",
    "cuaca Kabupaten Malang",
    "cuaca Kota Batu",
    "info gempa BMKG",
    "peringatan dini cuaca Jawa Timur",
    "Tetep Siaga Reks",
  ],
  authors: [{ name: "Tetep Siaga Reks" }],
  category: "weather",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "Tetep Siaga Reks",
    title: "Tetep Siaga Reks | Peta Cuaca & Kesiapsiagaan Malang Raya",
    description:
      "Peta cuaca interaktif 41 kecamatan, info gempa bumi TEWS, dan peringatan dini cuaca ekstrem CAP 1.2 untuk Malang Raya berbasis data resmi BMKG.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tetep Siaga Reks | Peta Cuaca & Kesiapsiagaan Malang Raya",
    description:
      "Peta cuaca interaktif 41 kecamatan, info gempa TEWS, dan peringatan dini CAP 1.2 Malang Raya berbasis data resmi BMKG.",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body className="antialiased">
        <a
          href="#konten-utama"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[var(--radius-control)] focus:bg-[var(--color-accent)] focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-[var(--color-accent-ink)]"
        >
          Lewati ke konten utama
        </a>
        {children}
      </body>
    </html>
  );
}
