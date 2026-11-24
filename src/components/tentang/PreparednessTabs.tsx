"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";

interface HazardGuide {
  id: string;
  label: string;
  badge: "waspada" | "bahaya" | "aman";
  badgeText: string;
  context: string;
  before: string[];
  during: string[];
  after: string[];
}

const HAZARDS: HazardGuide[] = [
  {
    id: "gempa",
    label: "Gempa Bumi Selatan Jawa",
    badge: "bahaya",
    badgeText: "Prioritas Utama",
    context:
      "Kabupaten Malang bagian selatan berhadapan langsung dengan zona subduksi Samudra Hindia, sehingga guncangan tektonik kerap terasa hingga cekungan Kota Malang dan Batu.",
    before: [
      "Kenali jalur keluar tercepat di rumah, kampus, atau tempat kerja dan pastikan tidak terhalang perabot.",
      " Kencangkan lemari tinggi ke dinding dan letakkan benda berat di rak bagian bawah.",
      "Siapkan tas siaga berisi air minum, senter, obat pribadi, peluit, dan salinan dokumen penting.",
    ],
    during: [
      "Merunduk, lindungi kepala dan leher di bawah meja kokoh, lalu berpegangan hingga guncangan berhenti.",
      "Jauhi jendela kaca, lampu gantung, serta dinding luar bangunan.",
      "Jika sedang berada di pantai Malang Selatan dan merasakan gempa kuat atau lama, segera menjauh ke dataran tinggi tanpa menunggu sirine.",
    ],
    after: [
      "Keluar bangunan melalui tangga biasa dengan tertib dan periksa kondisi anggota keluarga atau tetangga sekitar.",
      "Pantau pembaruan magnitudo, kedalaman, dan potensi tsunami resmi dari BMKG sebelum kembali masuk ke ruangan.",
    ],
  },
  {
    id: "hujan",
    label: "Hujan Lebat & Banjir Lintasan",
    badge: "waspada",
    badgeText: "Musim Hujan",
    context:
      "Curah hujan tinggi di hulu Batu dan Pujon dapat meningkatkan debit Sungai Brantas dengan cepat serta memicu genangan lintasan di jalan menurun Kota Malang.",
    before: [
      "Bersihkan saluran drainase di depan rumah dari sampah daun sebelum puncak hujan sore.",
      "Cek jendela kering harian di peta Tetep Siaga Reks sebelum merencanakan perjalanan roda dua.",
    ],
    during: [
      "Hindari menerobos genangan yang arusnya deras atau kedalamannya menutup knalpot kendaraan.",
      "Jangan berteduh tepat di bawah pohon rimbun tua, baliho besar, atau tiang listrik saat disertai petir.",
      "Di kawasan lereng Pujon, Ngantang, dan Poncokusumo, waspadai tebing tanah yang mulai mengeluarkan air keruh.",
    ],
    after: [
      "Periksa instalasi listrik yang sempat terkena rembesan air sebelum menyalakan peralatan rumah tangga.",
      "Bersihkan lumpur sisa genangan dengan sepatu tertutup untuk mencegah risiko infeksi kulit.",
    ],
  },
  {
    id: "angin",
    label: "Angin Kencang Lereng Gunung",
    badge: "waspada",
    badgeText: "Pancaroba",
    context:
      "Celah antar pegunungan Arjuno, Kawi, dan Semeru sering memperkuat embusan angin lokal pada masa peralihan musim, terutama di Karangploso, Singosari, Dau, dan Bumiaji.",
    before: [
      "Pangkas ranting pohon yang sudah rapuh di dekat atap rumah atau jaringan kabel.",
      "Pastikan atap seng, kanopi, dan jemuran terikat kuat agar tidak terangkat embusan angin.",
    ],
    during: [
      "Tutup dan kunci jendela serta pintu, lalu menjauh dari bidang kaca berukuran lebar.",
      "Bila sedang berkendara sepeda motor di jalur terbuka, kurangi kecepatan dan menepi di bangunan permanen hingga embusan mereda.",
    ],
    after: [
      "Hindari menyentuh kabel yang menjuntai di jalan akibat dahan tumbang dan laporkan ke petugas terkait.",
    ],
  },
];

export function PreparednessTabs() {
  const [activeId, setActiveId] = useState<string>("gempa");
  const active = HAZARDS.find((h) => h.id === activeId) ?? HAZARDS[0];
  if (!active) return null;

  return (
    <section
      aria-labelledby="judul-panduan-siaga"
      className="rounded-[var(--radius-map)] border border-[var(--color-border-subtle)] bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold text-[var(--color-accent)]">
            Panduan Praktis Warga
          </p>
          <h2
            id="judul-panduan-siaga"
            className="title-section mt-1 font-extrabold text-[var(--color-ink)]"
          >
            Langkah Siaga Tiga Risiko Utama Malang Raya
          </h2>
        </div>

        <div
          role="tablist"
          aria-label="Pilih jenis potensi bencana"
          className="flex flex-wrap gap-2"
        >
          {HAZARDS.map((h) => {
            const selected = h.id === active.id;
            return (
              <button
                key={h.id}
                id={`tab-${h.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${h.id}`}
                onClick={() => setActiveId(h.id)}
                className={`min-h-11 rounded-[var(--radius-control)] px-4 text-xs font-extrabold transition-colors ${
                  selected
                    ? "bg-[var(--color-accent)] text-white shadow-sm"
                    : "border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] text-[var(--color-ink)] hover:bg-[#e3eef5]"
                }`}
              >
                {h.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={`panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${active.id}`}
        className="mt-6"
      >
        <div className="flex flex-wrap items-center gap-2.5 rounded-[var(--radius-card)] bg-[var(--color-surface-subtle)] p-4">
          <Badge variant={active.badge}>{active.badgeText}</Badge>
          <p className="flex-1 text-sm font-medium leading-relaxed text-[var(--color-ink)]">
            {active.context}
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] p-5">
            <span className="inline-block rounded-md bg-[#e0f2fe] px-2.5 py-1 text-xs font-extrabold text-[#075985]">
              1. Sebelum Kejadian
            </span>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {active.before.map((step) => (
                <li key={step} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
                  />
                  <span>{step.trim()}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--color-warn-ink)]/25 bg-[#fffdf5] p-5">
            <span className="inline-block rounded-md bg-[var(--color-warn-bg)] px-2.5 py-1 text-xs font-extrabold text-[var(--color-warn-ink)]">
              2. Saat Kejadian
            </span>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[var(--color-ink)]">
              {active.during.map((step) => (
                <li key={step} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-warn-ink)]"
                  />
                  <span>{step.trim()}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--color-safe-ink)]/25 bg-[#f7fdf9] p-5">
            <span className="inline-block rounded-md bg-[var(--color-safe-bg)] px-2.5 py-1 text-xs font-extrabold text-[var(--color-safe-ink)]">
              3. Setelah Kejadian
            </span>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
              {active.after.map((step) => (
                <li key={step} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-safe-ink)]"
                  />
                  <span>{step.trim()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
