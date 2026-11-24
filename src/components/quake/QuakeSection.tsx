import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDistanceKm, haversineKm } from "@/lib/geo";
import type { Quake, Region } from "@/types";

interface QuakeSectionProps {
  latest: Quake;
  recentM5: Quake[];
  felt: Quake[];
  region: Region;
}

export function QuakeSection({
  latest,
  recentM5,
  felt,
  region,
}: QuakeSectionProps) {
  const distanceKm = haversineKm(
    { lat: region.lat, lng: region.lng },
    { lat: latest.lat, lng: latest.lng },
  );

  return (
    <section
      id="gempa"
      aria-labelledby="judul-gempa"
      className="grid gap-5 lg:grid-cols-12"
    >
      <Card className="p-5 lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="judul-gempa"
            className="title-section font-bold text-[var(--color-ink)]"
          >
            Info Gempa Bumi Terkini (BMKG)
          </h2>
          <Badge variant={latest.magnitude >= 5 ? "waspada" : "aman"}>
            M {latest.magnitude.toFixed(1)}
          </Badge>
        </div>

        <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
          {latest.regionDesc}
        </p>
        <p className="tabular-nums mt-0.5 text-xs text-[var(--color-ink-muted)]">
          {latest.wibLabel} · Kedalaman {latest.depthKm} km · Jarak{" "}
          {formatDistanceKm(distanceKm)} dari Kec. {region.kecamatan}
        </p>

        {latest.potential && (
          <p className="mt-3 rounded-[var(--radius-control)] bg-[var(--color-surface-subtle)] px-3 py-2 text-xs font-medium text-[var(--color-ink)]">
            Potensi: {latest.potential}
          </p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-bold text-[var(--color-ink-muted)]">
              Gempa M 5+ Terbaru
            </h3>
            <ul className="mt-2 space-y-2">
              {recentM5.slice(0, 4).map((q) => (
                <li
                  key={q.id}
                  className="rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 font-semibold text-[var(--color-ink)]">
                    <span className="tabular-nums">
                      M {q.magnitude.toFixed(1)}
                    </span>
                    <span className="tabular-nums text-[var(--color-ink-muted)]">
                      {q.depthKm} km
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[var(--color-ink-muted)]">
                    {q.regionDesc}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold text-[var(--color-ink-muted)]">
              Gempa Dirasakan
            </h3>
            <ul className="mt-2 space-y-2">
              {felt.slice(0, 4).map((q) => (
                <li
                  key={q.id}
                  className="rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 font-semibold text-[var(--color-ink)]">
                    <span className="tabular-nums">
                      M {q.magnitude.toFixed(1)}
                    </span>
                    <span className="tabular-nums text-[var(--color-ink-muted)]">
                      {q.depthKm} km
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[var(--color-ink-muted)]">
                    {q.feltMmi ?? q.regionDesc}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Honest static placeholder for MapLibre quake map (Tahap 3) */}
      <Card className="flex flex-col justify-between p-5 lg:col-span-5">
        <div>
          <Badge variant="neutral">Tahap 3 · MapLibre lazy</Badge>
          <h3 className="mt-3 text-base font-bold text-[var(--color-ink)]">
            Peta Sebaran Episenter Gempa
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
            Peta basemap Indonesia menggunakan MapLibre + OpenFreeMap akan
            dimuat malas (lazy) di area ini pada Tahap 3 agar muatan halaman
            utama tetap ringan.
          </p>
        </div>

        <div className="mt-5 rounded-[var(--radius-control)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-4 text-xs text-[var(--color-ink-muted)]">
          <p className="font-semibold text-[var(--color-ink)]">
            Koordinat episenter terbaru (fixture BMKG):
          </p>
          <p className="tabular-nums mt-1">
            Lintang {latest.lat}, Bujur {latest.lng} · Magnitudo{" "}
            {latest.magnitude.toFixed(1)}
          </p>
        </div>
      </Card>
    </section>
  );
}
