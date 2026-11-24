import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { PreparednessTabs } from "@/components/tentang/PreparednessTabs";
import { Badge } from "@/components/ui/Badge";
import { getDefaultRegion } from "@/lib/regions";

export const metadata: Metadata = {
  title: "Tentang & Panduan Siaga | Tetep Siaga Reks",
  description:
    "Mengenal mikro-iklim Malang Raya dari pesisir selatan hingga lereng gunung, panduan kesiapsiagaan warga, dan sumber data resmi BMKG.",
};

const MICROCLIMATE_ZONES = [
  {
    zone: "Dataran Tinggi & Lereng",
    elevation: "700 - 2.000+ mdpl",
    areas: "Kota Batu, Bumiaji, Pujon, Ngantang, Poncokusumo",
    character:
      "Udara sejuk 16°C hingga 23°C, kabut tipis sore hari, serta pembentukan awan hujan orografis yang cepat di lereng Arjuno dan Semeru.",
    swatch: "#38bdf8",
    href: "/wilayah/35-79-01-1001",
    cta: "Lihat cuaca Kota Batu",
  },
  {
    zone: "Cekungan Lembah Perkotaan",
    elevation: "400 - 650 mdpl",
    areas: "Klojen, Lowokwaru, Blimbing, Singosari, Kepanjen",
    character:
      "Suhu harian nyaman 22°C hingga 30°C. Hujan deras siang hingga sore hari memerlukan kewaspadaan terhadap genangan jalan menurun.",
    swatch: "#84cc16",
    href: "/wilayah/35-73-02-1001",
    cta: "Lihat cuaca Klojen",
  },
  {
    zone: "Pesisir Malang Selatan",
    elevation: "0 - 250 mdpl",
    areas: "Bantur, Donomulyo, Gedangan, Sumbermanjing Wetan, Tirtoyudo",
    character:
      "Lebih hangat 25°C hingga 32°C dengan angin laut Samudra Hindia yang kuat serta berhadapan langsung dengan zona kegempaan selatan Jawa.",
    swatch: "#f97316",
    href: "/wilayah/35-07-03-2001",
    cta: "Lihat cuaca Bantur",
  },
];

export default function TentangPage() {
  const defaultRegion = getDefaultRegion();

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-canvas)]">
      <Header currentRegion={defaultRegion} />

      <main
        id="konten-utama"
        className="mx-auto flex w-full max-w-[1160px] flex-1 flex-col gap-8 px-4 py-7 sm:px-6 sm:py-10"
      >
        {/* 1. Rich Atmospheric Highland Hero Banner */}
        <section
          style={{ background: "var(--hero-pagi-cerah)" }}
          className="relative overflow-hidden rounded-[24px] px-6 py-9 text-white shadow-lg sm:px-10 sm:py-12"
        >
          {/* Custom SVG Malang Raya Mountain Ridge Backdrop */}
          <svg
            viewBox="0 0 1200 260"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-44 w-full"
          >
            <path
              d="M0 260V178L145 112L280 156L455 58L610 144L790 84L985 28L1200 136V260H0Z"
              fill="rgba(255,255,255,0.10)"
            />
            <path
              d="M0 260V206L190 154L365 194L555 118L745 182L940 108L1200 188V260H0Z"
              fill="rgba(255,255,255,0.14)"
            />
          </svg>

          <div className="relative grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="text-xs font-extrabold tracking-wide text-[#E2F1FF]">
                Peta Cuaca &amp; Kesiapsiagaan Lokal
              </p>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                Membaca Langit dan Bentang Alam Malang Raya dalam Satu Peta
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#E2F1FF] sm:text-base">
                Dari puncak dingin Bumiaji dan Pujon hingga garis pantai Samudra
                Hindia di Sumbermanjing Wetan, kondisi cuaca Malang Raya bisa
                berbeda jauh hanya dalam jarak belasan kilometer. Tetep Siaga
                Reks menyatukan data resmi BMKG ke atas peta geografis 41
                kecamatan agar mudah dipahami warga setiap hari.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-white px-5 text-sm font-extrabold text-[var(--color-accent)] shadow-md hover:bg-[#f0f7fc]"
                >
                  Jelajahi Peta Malang Raya
                </Link>
                <a
                  href="#judul-panduan-siaga"
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-white/35 bg-white/10 px-4 text-sm font-bold text-white hover:bg-white/20"
                >
                  Baca Panduan Siaga
                </a>
              </div>
            </div>

            {/* Verified Dataset Coverage Counters (R-17 real numbers only) */}
            <dl className="grid grid-cols-3 gap-2.5 lg:col-span-4">
              <div className="rounded-[var(--radius-card)] border border-white/25 bg-white/15 p-3.5">
                <dt className="text-[11px] font-semibold text-[#E2F1FF]">
                  Kecamatan
                </dt>
                <dd className="tabular-nums mt-1 text-2xl font-extrabold text-white sm:text-3xl">
                  41
                </dd>
              </div>
              <div className="rounded-[var(--radius-card)] border border-white/25 bg-white/15 p-3.5">
                <dt className="text-[11px] font-semibold text-[#E2F1FF]">
                  Desa/Kel.
                </dt>
                <dd className="tabular-nums mt-1 text-2xl font-extrabold text-white sm:text-3xl">
                  471
                </dd>
              </div>
              <div className="rounded-[var(--radius-card)] border border-white/25 bg-white/15 p-3.5">
                <dt className="text-[11px] font-semibold text-[#E2F1FF]">
                  Kota/Kab.
                </dt>
                <dd className="tabular-nums mt-1 text-2xl font-extrabold text-white sm:text-3xl">
                  3
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* 2. Asymmetric Microclimate & Elevation Section */}
        <section
          aria-labelledby="judul-mikroiklim"
          className="grid gap-6 lg:grid-cols-12 lg:items-stretch"
        >
          <div className="flex flex-col justify-between rounded-[var(--radius-map)] border border-[var(--color-border-subtle)] bg-white p-6 shadow-sm lg:col-span-5">
            <div>
              <p className="text-xs font-extrabold text-[var(--color-accent)]">
                Kontras Topografi
              </p>
              <h2
                id="judul-mikroiklim"
                className="title-section mt-1 font-extrabold text-[var(--color-ink)]"
              >
                Mengapa Batu Sejuk Saat Pantai Selatan Terik?
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                Malang Raya dikelilingi cincin gunung berapi (Arjuno-Welirang,
                Kawi-Butak, Bromo-Tengger-Semeru) yang melandai turun ke
                cekungan Sungai Brantas lalu berakhir di laut lepas selatan.
                Karena perbedaan elevasi ekstrem ini, kalimat saran di Tetep
                Siaga Reks menyesuaikan ketinggian wilayah yang kamu klik.
              </p>
            </div>

            {/* Visual Elevation Cross-Section SVG */}
            <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-gradient-to-b from-[#e4f2fb] to-[#f8fbfd] p-4">
              <p className="text-[11px] font-extrabold text-[var(--color-ink)]">
                Penampang Elevasi Utara - Selatan Malang Raya
              </p>
              <svg
                viewBox="0 0 420 150"
                className="mt-2 h-auto w-full"
                role="img"
                aria-label="Diagram profil ketinggian dari pegunungan utara, lembah Kota Malang, hingga Samudra Hindia"
              >
                <title>Penampang Elevasi Malang Raya</title>
                <path
                  d="M12 130 L78 28 L138 62 L212 88 L286 96 L354 124 L408 130 Z"
                  fill="#0b5394"
                  fillOpacity="0.16"
                  stroke="#0b5394"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />
                {/* Ocean highlight */}
                <line
                  x1="348"
                  y1="128"
                  x2="408"
                  y2="128"
                  stroke="#0284c7"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle
                  cx="78"
                  cy="28"
                  r="4"
                  fill="#38bdf8"
                  stroke="#0f1e26"
                  strokeWidth="1.5"
                />
                <text
                  x="78"
                  y="18"
                  textAnchor="middle"
                  fill="#0f1e26"
                  fontSize="10"
                  fontWeight="800"
                >
                  Batu &amp; Lereng (1.000m+)
                </text>

                <circle
                  cx="212"
                  cy="88"
                  r="4"
                  fill="#84cc16"
                  stroke="#0f1e26"
                  strokeWidth="1.5"
                />
                <text
                  x="212"
                  y="76"
                  textAnchor="middle"
                  fill="#0f1e26"
                  fontSize="10"
                  fontWeight="800"
                >
                  Kota Malang (~460m)
                </text>

                <circle
                  cx="364"
                  cy="126"
                  r="4"
                  fill="#f97316"
                  stroke="#0f1e26"
                  strokeWidth="1.5"
                />
                <text
                  x="350"
                  y="112"
                  textAnchor="middle"
                  fill="#0f1e26"
                  fontSize="10"
                  fontWeight="800"
                >
                  Pesisir (0m)
                </text>
              </svg>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-7">
            {MICROCLIMATE_ZONES.map((z) => (
              <article
                key={z.zone}
                className="flex flex-col justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-5 shadow-sm sm:flex-row sm:items-center"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      aria-hidden="true"
                      style={{ backgroundColor: z.swatch }}
                      className="h-3.5 w-3.5 rounded-full border border-black/20"
                    />
                    <h3 className="text-base font-extrabold text-[var(--color-ink)]">
                      {z.zone}
                    </h3>
                    <Badge variant="neutral">{z.elevation}</Badge>
                  </div>
                  <p className="text-xs font-bold text-[var(--color-accent)]">
                    {z.areas}
                  </p>
                  <p className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
                    {z.character}
                  </p>
                </div>

                <Link
                  href={z.href}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-3.5 text-xs font-extrabold text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  {z.cta}
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* 3. Interactive Preparedness Playbook */}
        <PreparednessTabs />

        {/* 4. Data Sources, Open Attribution & Disclaimer */}
        <section
          aria-labelledby="judul-sumber-data"
          className="grid gap-6 md:grid-cols-2"
        >
          <div className="rounded-[var(--radius-map)] border border-[var(--color-border-subtle)] bg-white p-6 shadow-sm">
            <h2
              id="judul-sumber-data"
              className="title-section font-extrabold text-[var(--color-ink)]"
            >
              Sumber Data Resmi &amp; Lisensi Terbuka
            </h2>
            <dl className="mt-4 space-y-3.5 text-sm">
              <div className="rounded-[var(--radius-control)] bg-[var(--color-surface-subtle)] p-3.5">
                <dt className="font-extrabold text-[var(--color-ink)]">
                  BMKG Publik API (Prakiraan Cuaca ADM4)
                </dt>
                <dd className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                  Menyediakan prakiraan suhu, kelembapan, curah hujan, kecepatan
                  serta arah angin, dan jarak pandang per 3 jam hingga 3 hari ke
                  depan pada tingkat desa/kelurahan.
                </dd>
              </div>
              <div className="rounded-[var(--radius-control)] bg-[var(--color-surface-subtle)] p-3.5">
                <dt className="font-extrabold text-[var(--color-ink)]">
                  BMKG TEWS &amp; Nowcast CAP 1.2
                </dt>
                <dd className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                  Umpan gempa bumi terbaru, daftar gempa M 5+, gempa dirasakan,
                  serta peringatan dini cuaca ekstrem berbasis poligon area Jawa
                  Timur.
                </dd>
              </div>
              <div className="rounded-[var(--radius-control)] bg-[var(--color-surface-subtle)] p-3.5">
                <dt className="font-extrabold text-[var(--color-ink)]">
                  Peta &amp; Batas Wilayah Terbuka
                </dt>
                <dd className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                  Poligon 41 kecamatan dan 471 kode wilayah berasal dari
                  repositori cahyadsn/wilayah &amp; wilayah_boundaries (MIT).
                  Peta dasar vektor disediakan oleh OpenFreeMap (OpenStreetMap
                  contributors) dengan mesin MapLibre GL.
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col justify-between rounded-[var(--radius-map)] border border-[var(--color-border-subtle)] bg-white p-6 shadow-sm">
            <div>
              <h2 className="title-section font-extrabold text-[var(--color-ink)]">
                Catatan Penggunaan &amp; Keterbatasan
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                Tetep Siaga Reks dibuat sebagai alat bantu baca cepat untuk
                kesiapsiagaan harian warga Malang Raya. Data prakiraan merupakan
                keluaran model cuaca numerik yang dapat berubah cepat mengikuti
                dinamika atmosfer lokal pegunungan.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                Dalam situasi darurat bencana, selalu ikuti instruksi evakuasi
                dan peringatan resmi dari{" "}
                <strong className="font-bold text-[var(--color-ink)]">
                  BMKG, BPBD Kota Malang, BPBD Kabupaten Malang, dan BPBD Kota
                  Batu
                </strong>
                .
              </p>
            </div>

            <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] p-4">
              <p className="text-xs font-extrabold text-[var(--color-ink)]">
                Status Rilis: v1.0 (Seluruh Data Resmi BMKG &amp; Mode Offline
                Aktif)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-muted)]">
                Seluruh fitur utama telah aktif penuh: peta suhu 41 kecamatan,
                prakiraan 471 desa/kelurahan, 3 umpan gempa bumi TEWS + peta
                episenter, peringatan dini CAP 1.2 XML Jawa Timur, geolokasi
                point-in-polygon, mode offline, serta dukungan PWA dan SEO.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer updatedAtWib="10.00 WIB" />
    </div>
  );
}
