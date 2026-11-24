import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { LocationCombobox } from "@/components/ui/LocationCombobox";
import type { Region } from "@/types";

interface HeaderProps {
  currentRegion: Region;
}

export function Header({ currentRegion }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-5">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-base font-extrabold tracking-tight text-[var(--color-ink)] hover:text-[var(--color-accent)]"
          >
            <BrandLogo size={28} className="shrink-0" />
            <span>Tetep Siaga Reks</span>
            <span className="rounded-md bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-bold text-white">
              Malang Raya
            </span>
          </Link>
        </div>

        <div className="flex w-full items-center justify-between gap-2.5 sm:w-auto sm:flex-nowrap sm:justify-end">
          <div className="min-w-0 flex-1 sm:w-72">
            <LocationCombobox currentRegion={currentRegion} />
          </div>
          <Link
            href="/"
            className="inline-flex min-h-11 shrink-0 items-center rounded-[var(--radius-control)] bg-[var(--color-accent)] px-4 text-xs font-extrabold text-white hover:bg-[var(--color-accent-hover)]"
          >
            Buka Peta Interaktif
          </Link>
        </div>
      </div>
    </header>
  );
}
