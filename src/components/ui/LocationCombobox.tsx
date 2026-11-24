"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { GeolocationStatus } from "@/hooks/useGeolocation";
import { ALL_REGIONS, adm4ToSlug } from "@/lib/regions";
import type { Region } from "@/types";

interface LocationComboboxProps {
  currentRegion: Region;
  savedRegion?: Region | null;
  placeholder?: string;
  onSelectAdm4?: (adm4: string) => void;
  onOpen?: () => void;
  onRequestGeolocation?: () => void;
  geoStatus?: GeolocationStatus;
  geoError?: string | null;
}

interface RegionGroup {
  adm3: string;
  kecamatan: string;
  kotkab: string;
  items: Array<{ region: Region; flatIndex: number }>;
}

const POPULAR_ADM4 = [
  "35.73.02.1001", // Klojen, Kota Malang
  "35.79.01.1001", // Sisir, Kec. Batu
  "35.73.05.1001", // Tunggulwulung, Kec. Lowokwaru
  "35.07.13.1004", // Kepanjen, Kab. Malang
  "35.07.26.2005", // Pandesari, Kec. Pujon
];

export function LocationCombobox({
  currentRegion,
  savedRegion = null,
  placeholder = "Cari kecamatan...",
  onSelectAdm4,
  onOpen,
  onRequestGeolocation,
  geoStatus = "idle",
  geoError = null,
}: LocationComboboxProps) {
  const router = useRouter();
  const inputId = useId();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const { groups, flatItems } = useMemo(() => {
    const q = query.trim().toLowerCase();
    let candidates: Region[] = [];

    if (!q) {
      const seen = new Set<string>();
      const pushUnique = (r: Region | undefined | null) => {
        if (r && !seen.has(r.adm4)) {
          seen.add(r.adm4);
          candidates.push(r);
        }
      };

      if (savedRegion) {
        pushUnique(savedRegion);
      }

      for (const r of ALL_REGIONS) {
        if (r.adm3 === currentRegion.adm3 && candidates.length < 7) {
          pushUnique(r);
        }
      }

      for (const code of POPULAR_ADM4) {
        const found = ALL_REGIONS.find((r) => r.adm4 === code);
        pushUnique(found);
      }
    } else {
      const scored: Array<{ region: Region; score: number }> = [];
      for (const r of ALL_REGIONS) {
        const desaLower = r.desa.toLowerCase();
        const kecLower = r.kecamatan.toLowerCase();
        const kotLower = r.kotkab.toLowerCase();

        let score = 0;
        if (kecLower === q || desaLower === q) {
          score = 100;
        } else if (kecLower.startsWith(q)) {
          score = 85;
        } else if (desaLower.startsWith(q)) {
          score = 80;
        } else if (kecLower.includes(q)) {
          score = 60;
        } else if (desaLower.includes(q)) {
          score = 55;
        } else if (kotLower.includes(q)) {
          score = 30;
        }

        if (score > 0) {
          scored.push({ region: r, score });
        }
      }

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.region.kecamatan !== b.region.kecamatan) {
          return a.region.kecamatan.localeCompare(b.region.kecamatan, "id");
        }
        return a.region.desa.localeCompare(b.region.desa, "id");
      });

      candidates = scored.slice(0, 24).map((s) => s.region);
    }

    // Kelompokkan per Kecamatan (adm3) sambil mempertahankan indeks datar untuk navigasi keyboard
    const groupMap = new Map<string, Region[]>();
    for (const r of candidates) {
      const existing = groupMap.get(r.adm3);
      if (existing) {
        existing.push(r);
      } else {
        groupMap.set(r.adm3, [r]);
      }
    }

    const builtGroups: RegionGroup[] = [];
    const builtFlat: Region[] = [];
    for (const [adm3, items] of groupMap.entries()) {
      const first = items[0];
      if (!first) continue;
      const groupItems = items.map((region) => {
        const flatIndex = builtFlat.length;
        builtFlat.push(region);
        return { region, flatIndex };
      });
      builtGroups.push({
        adm3,
        kecamatan: first.kecamatan,
        kotkab: first.kotkab,
        items: groupItems,
      });
    }

    return { groups: builtGroups, flatItems: builtFlat };
  }, [query, currentRegion.adm3, savedRegion]);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const activeEl = optionRefs.current[activeIndex];
    if (activeEl && typeof activeEl.scrollIntoView === "function") {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  function selectRegion(region: Region) {
    setOpen(false);
    setQuery("");
    if (onSelectAdm4) {
      onSelectAdm4(region.adm4);
    } else {
      router.push(`/wilayah/${adm4ToSlug(region.adm4)}`, { scroll: false });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        flatItems.length === 0 ? 0 : (prev + 1) % flatItems.length,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        flatItems.length === 0
          ? 0
          : (prev - 1 + flatItems.length) % flatItems.length,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatItems[activeIndex];
      if (target) selectRegion(target);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const activeDescendantId =
    open && flatItems[activeIndex] ? `${listId}-opt-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className="relative w-full">
      <label htmlFor={inputId} className="sr-only">
        Cari kelurahan atau kecamatan di Malang Raya
      </label>
      <div className="relative flex items-center">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="pointer-events-none absolute left-3 text-[var(--color-ink-muted)]"
        >
          <circle
            cx="11"
            cy="11"
            r="7"
            stroke="currentColor"
            strokeWidth="2.2"
          />
          <path
            d="M20 20L16.4 16.4"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
        <input
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeDescendantId}
          aria-autocomplete="list"
          value={query}
          onFocus={() => {
            setOpen(true);
            onOpen?.();
          }}
          onClick={() => {
            setOpen(true);
            onOpen?.();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-10 w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] pr-3 pl-9 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] sm:min-h-11"
        />
      </div>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Hasil pencarian wilayah Malang Raya per kecamatan"
          className="custom-scrollbar fixed top-[68px] right-3 left-3 z-50 max-h-[65dvh] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-2 shadow-2xl sm:absolute sm:top-full sm:right-auto sm:left-0 sm:mt-2 sm:max-h-96 sm:w-full sm:min-w-[340px]"
        >
          {/* Quick Geolocation Action inside Dropdown (works cleanly on mobile & desktop) */}
          {onRequestGeolocation && (
            <div className="mb-1.5 border-b border-[var(--color-border-subtle)] pb-1.5">
              <button
                type="button"
                disabled={geoStatus === "locating"}
                onClick={() => {
                  onRequestGeolocation();
                  setOpen(false);
                }}
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-control)] bg-[#eef6fc] px-3 py-2 text-left text-xs font-extrabold text-[var(--color-accent)] transition-colors hover:bg-[#dfeefb] disabled:opacity-65"
              >
                <span className="inline-flex items-center gap-2">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="shrink-0"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="7"
                      stroke="currentColor"
                      strokeWidth="2.1"
                    />
                    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                    <path
                      d="M12 2v3M12 19v3M2 12h3M19 12h3"
                      stroke="currentColor"
                      strokeWidth="2.1"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>
                    {geoStatus === "locating"
                      ? "Mendeteksi kelurahan terdekat..."
                      : "Gunakan lokasi saya"}
                  </span>
                </span>
                <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-ink-muted)]">
                  GPS terdekat
                </span>
              </button>
              {geoError && (
                <p className="mt-1.5 rounded-md bg-[var(--color-warn-bg)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-warn-ink)]">
                  {geoError}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-2.5 pb-1.5 text-[11px] font-bold text-[var(--color-ink-muted)]">
            <span>
              {query.trim()
                ? `Hasil pencarian "${query.trim()}" (${flatItems.length})`
                : `Dikelompokkan per kecamatan (471 desa/kelurahan)`}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-1.5 py-0.5 text-[11px] font-bold text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)]"
            >
              Tutup
            </button>
          </div>

          <div className="mt-1.5 space-y-2">
            {groups.length === 0 ? (
              <div className="px-3 py-4 text-sm text-[var(--color-ink-muted)]">
                Wilayah &ldquo;{query}&rdquo; tidak ditemukan di Malang Raya.
                Coba ketik nama kecamatan seperti Klojen, Batu, Pujon, atau
                Kepanjen.
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.adm3} className="space-y-0.5">
                  <div className="flex items-center justify-between rounded bg-[var(--color-surface-subtle)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--color-ink-muted)]">
                    <span>Kec. {group.kecamatan}</span>
                    <span>{group.kotkab}</span>
                  </div>
                  {group.items.map(({ region: item, flatIndex }) => {
                    const isHighlighted = flatIndex === activeIndex;
                    const isCurrent = item.adm4 === currentRegion.adm4;
                    const isSaved = savedRegion?.adm4 === item.adm4;
                    return (
                      <button
                        key={item.adm4}
                        id={`${listId}-opt-${flatIndex}`}
                        ref={(el) => {
                          optionRefs.current[flatIndex] = el;
                        }}
                        type="button"
                        role="option"
                        aria-selected={isCurrent}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        onClick={() => selectRegion(item)}
                        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm transition-colors ${
                          isHighlighted
                            ? "bg-[#e6f2fb] text-[var(--color-ink)]"
                            : "text-[var(--color-ink)] hover:bg-[var(--color-surface-subtle)]"
                        }`}
                      >
                        <span className="min-w-0 truncate">
                          <span className="font-bold text-[var(--color-ink)]">
                            {item.desa}
                          </span>
                          <span className="text-xs text-[var(--color-ink-muted)]">
                            {" "}
                            · Kec. {item.kecamatan}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {isSaved && (
                            <span className="rounded bg-[#e6f2fb] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-accent)]">
                              Tersimpan
                            </span>
                          )}
                          {isCurrent && (
                            <span className="rounded bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                              Aktif
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
