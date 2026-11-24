export default function GlobalLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="flex min-h-dvh flex-col items-center justify-center bg-[#cae6f7] px-4 text-center"
    >
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white px-6 py-4 shadow-lg">
        <p className="text-sm font-extrabold text-[var(--color-ink)]">
          Tetep Siaga Reks
        </p>
        <p className="mt-1 text-xs font-semibold text-[var(--color-ink-muted)]">
          Memuat peta cuaca dan data resmi BMKG Malang Raya...
        </p>
      </div>
    </main>
  );
}
