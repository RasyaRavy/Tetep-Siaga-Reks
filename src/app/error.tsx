"use client";

import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main
      id="konten-utama"
      className="flex min-h-dvh items-center justify-center bg-[var(--color-canvas)] px-4 py-12"
    >
      <div className="w-full max-w-md rounded-[var(--radius-map)] border border-[var(--color-border-subtle)] bg-white p-6 text-center shadow-lg">
        <p className="text-xs font-extrabold tracking-wide text-[var(--color-accent)]">
          Tetep Siaga Reks
        </p>
        <h1 className="title-section mt-2 font-extrabold text-[var(--color-ink)]">
          Terjadi kendala saat memuat halaman
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {error.message ||
            "Sambungan ke layanan data cuaca sedang terganggu. Anda dapat mencoba memuat ulang halaman ini."}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 text-xs font-extrabold text-white hover:bg-[var(--color-accent-hover)]"
          >
            Muat ulang halaman
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-subtle)] px-4 text-xs font-extrabold text-[var(--color-ink)] hover:border-[var(--color-border)]"
          >
            Kembali ke Peta
          </Link>
        </div>
      </div>
    </main>
  );
}
