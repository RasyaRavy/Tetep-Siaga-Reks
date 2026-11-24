interface FooterProps {
  updatedAtWib: string;
}

export function Footer({ updatedAtWib }: FooterProps) {
  return (
    <footer className="mt-10 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-4 py-6 text-xs text-[var(--color-ink-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-semibold text-[var(--color-ink)]">
            Sumber data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)
          </p>
          <p className="mt-0.5">
            Pembaruan terakhir: {updatedAtWib} · Batas wilayah: cahyadsn/wilayah
            (MIT). Gunakan informasi ini sebagai pendamping kesiapsiagaan
            harian.
          </p>
        </div>
      </div>
    </footer>
  );
}
