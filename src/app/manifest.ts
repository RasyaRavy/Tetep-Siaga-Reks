import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tetep Siaga Reks | Cuaca & Kesiapsiagaan Malang Raya",
    short_name: "Siaga Reks",
    description:
      "Peta cuaca interaktif 41 kecamatan, info gempa bumi TEWS, dan peringatan dini cuaca ekstrem CAP 1.2 untuk Malang Raya berbasis data resmi BMKG.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7fafc",
    theme_color: "#0b5394",
    lang: "id",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
