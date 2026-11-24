"use client";

import {
  type GeoJSONSource,
  type MapLayerMouseEvent,
  Map as MapLibreMap,
  type StyleSpecification,
  setWorkerUrl,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import malangGeoRaw from "@/data/malang-raya-geo.json";
import { getRegionsInKecamatan, KECAMATAN_MAP } from "@/lib/regions";
import type { KecamatanShape, KecamatanWeatherSummary, Region } from "@/types";
import { MapTooltip } from "./MapTooltip";

type GeoJsonInput = Parameters<GeoJSONSource["setData"]>[0];

interface RealisticMalangMapProps {
  selectedRegion: Region | null;
  drawerOpen: boolean;
  summaries: KecamatanWeatherSummary[];
  onSelectKecamatan: (kec: KecamatanShape) => void;
  onSelectDesa: (adm4: string) => void;
  onEmptyMapClick?: () => void;
}

const MALANG_CENTER: [number, number] = [112.64, -8.07];
const DEFAULT_ZOOM = 9.55;
const DEFAULT_PITCH = 32;
const DEFAULT_BEARING = -4;

function getTempFillHex(tempC: number): string {
  if (tempC < 20) return "#38bdf8";
  if (tempC <= 23) return "#2dd4bf";
  if (tempC <= 27) return "#84cc16";
  if (tempC <= 30) return "#fbbf24";
  return "#f97316";
}

const OFFLINE_FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "east-java-land": {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { kind: "land" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [111.8, -7.35],
                  [113.55, -7.42],
                  [113.45, -8.36],
                  [112.95, -8.39],
                  [112.72, -8.45],
                  [112.45, -8.42],
                  [112.15, -8.35],
                  [111.8, -8.28],
                  [111.8, -7.35],
                ],
              ],
            },
          },
        ],
      },
    },
    "mountain-relief": {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { elev: 1 },
            geometry: { type: "Point", coordinates: [112.922, -8.108] },
          },
          {
            type: "Feature",
            properties: { elev: 1 },
            geometry: { type: "Point", coordinates: [112.589, -7.725] },
          },
          {
            type: "Feature",
            properties: { elev: 1 },
            geometry: { type: "Point", coordinates: [112.45, -7.92] },
          },
        ],
      },
    },
  },
  layers: [
    {
      id: "ocean-bg",
      type: "background",
      paint: { "background-color": "#9fd3f0" },
    },
    {
      id: "east-java-land-fill",
      type: "fill",
      source: "east-java-land",
      paint: { "fill-color": "#e5efe2" },
    },
    {
      id: "east-java-coastline",
      type: "line",
      source: "east-java-land",
      paint: { "line-color": "#5899bf", "line-width": 2 },
    },
    {
      id: "mountain-halo-outer",
      type: "circle",
      source: "mountain-relief",
      paint: {
        "circle-radius": 78,
        "circle-color": "#bdd5b8",
        "circle-blur": 0.85,
        "circle-opacity": 0.65,
      },
    },
    {
      id: "mountain-halo-inner",
      type: "circle",
      source: "mountain-relief",
      paint: {
        "circle-radius": 38,
        "circle-color": "#97b894",
        "circle-blur": 0.65,
        "circle-opacity": 0.65,
      },
    },
  ],
};

export function RealisticMalangMap({
  selectedRegion,
  drawerOpen,
  summaries,
  onSelectKecamatan,
  onSelectDesa,
  onEmptyMapClick,
}: RealisticMalangMapProps) {
  const isZoomed = selectedRegion !== null;
  const selectedAdm3 = selectedRegion?.adm3 ?? "";
  const selectedAdm4 = selectedRegion?.adm4 ?? "";
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [is3D, setIs3D] = useState(true);

  const [hoveredKec, setHoveredKec] = useState<KecamatanShape | null>(null);
  const [touchPinnedKec, setTouchPinnedKec] = useState<KecamatanShape | null>(
    null,
  );
  const [cursorPx, setCursorPx] = useState<{ x: number; y: number }>({
    x: 400,
    y: 300,
  });
  const [containerWidth, setContainerWidth] = useState(1200);

  const callbacksRef = useRef({
    onSelectKecamatan,
    onSelectDesa,
    onEmptyMapClick,
  });
  callbacksRef.current = {
    onSelectKecamatan,
    onSelectDesa,
    onEmptyMapClick,
  };

  const summaryByAdm3 = useMemo(
    () => new Map(summaries.map((s) => [s.adm3, s])),
    [summaries],
  );

  const kecByAdm3 = useMemo(
    () => new Map(KECAMATAN_MAP.kecamatan.map((k) => [k.adm3, k])),
    [],
  );

  const enrichedGeoJson = useMemo(() => {
    const base = malangGeoRaw as {
      type: "FeatureCollection";
      features: Array<{
        type: "Feature";
        id: number;
        properties: Record<string, unknown> & { adm3: string; name: string };
        geometry: unknown;
      }>;
    };

    return {
      type: "FeatureCollection" as const,
      features: base.features.map((f) => {
        const s = summaryByAdm3.get(f.properties.adm3);
        const tempC = s?.tempC ?? 25;
        return {
          ...f,
          properties: {
            ...f.properties,
            tempC,
            weatherDesc: s?.weatherDesc ?? "Berawan",
            fillColor: getTempFillHex(tempC),
          },
        };
      }),
    };
  }, [summaryByAdm3]);

  const desaPinsGeoJson = useMemo(() => {
    const desas = selectedAdm3 ? getRegionsInKecamatan(selectedAdm3) : [];
    return {
      type: "FeatureCollection" as const,
      features: desas.map((d) => ({
        type: "Feature" as const,
        properties: {
          adm4: d.adm4,
          desa: d.desa,
          isCurrent: d.adm4 === selectedAdm4 ? 1 : 0,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [d.lng, d.lat],
        },
      })),
    };
  }, [selectedAdm3, selectedAdm4]);

  const initialGeoRef = useRef({
    enrichedGeoJson,
    desaPinsGeoJson,
    selectedAdm3,
  });
  initialGeoRef.current = {
    enrichedGeoJson,
    desaPinsGeoJson,
    selectedAdm3,
  };

  // Initialize MapLibre GL ONCE for the entire session (never remounts on region change)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setContainerWidth(el.clientWidth || window.innerWidth);
    const onResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    window.addEventListener("resize", onResize);

    let cancelled = false;

    async function bootMap() {
      let resolvedStyle: string | StyleSpecification = OFFLINE_FALLBACK_STYLE;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(
          "https://tiles.openfreemap.org/styles/liberty",
          { signal: controller.signal },
        );
        clearTimeout(timer);
        if (res.ok) {
          resolvedStyle = (await res.json()) as StyleSpecification;
        }
      } catch {
        resolvedStyle = OFFLINE_FALLBACK_STYLE;
      }

      if (cancelled || !containerRef.current) return;

      setWorkerUrl("/maplibre-gl-worker.js");

      const map = new MapLibreMap({
        container: containerRef.current,
        style: resolvedStyle,
        center: MALANG_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: DEFAULT_PITCH,
        bearing: DEFAULT_BEARING,
        minZoom: 8.2,
        maxZoom: 15.5,
        attributionControl: { compact: true },
      });

      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;

        // Place all polygon & border layers BELOW OpenFreeMap text/symbol layers so "Batu", "Malang", etc. render crisply ON TOP!
        const firstSymbolId = map
          .getStyle()
          .layers?.find((l) => l.type === "symbol")?.id;

        map.addSource("malang-kecamatan", {
          type: "geojson",
          data: initialGeoRef.current
            .enrichedGeoJson as unknown as GeoJsonInput,
        });

        map.addLayer(
          {
            id: "kecamatan-casing",
            type: "line",
            source: "malang-kecamatan",
            paint: {
              "line-color": "rgba(255, 255, 255, 0.75)",
              "line-width": 3,
            },
          },
          firstSymbolId,
        );

        map.addLayer(
          {
            id: "kecamatan-fill",
            type: "fill",
            source: "malang-kecamatan",
            paint: {
              "fill-color": ["get", "fillColor"],
              "fill-opacity": [
                "case",
                ["==", ["get", "adm3"], initialGeoRef.current.selectedAdm3],
                0.66,
                0.38,
              ],
            },
          },
          firstSymbolId,
        );

        map.addLayer(
          {
            id: "kecamatan-outline",
            type: "line",
            source: "malang-kecamatan",
            paint: {
              "line-color": [
                "case",
                ["in", ["get", "adm2"], ["literal", ["35.73", "35.79"]]],
                "#0f1e26",
                "#334155",
              ],
              "line-width": [
                "case",
                ["in", ["get", "adm2"], ["literal", ["35.73", "35.79"]]],
                1.8,
                1.1,
              ],
            },
          },
          firstSymbolId,
        );

        // Persistent Selected Kecamatan Highlight (always visible even when drawer is closed!)
        map.addLayer(
          {
            id: "kecamatan-selected-halo",
            type: "line",
            source: "malang-kecamatan",
            filter: ["==", ["get", "adm3"], initialGeoRef.current.selectedAdm3],
            paint: {
              "line-color": "#ffffff",
              "line-width": 7,
              "line-opacity": 0.96,
            },
          },
          firstSymbolId,
        );

        map.addLayer(
          {
            id: "kecamatan-selected-line",
            type: "line",
            source: "malang-kecamatan",
            filter: ["==", ["get", "adm3"], initialGeoRef.current.selectedAdm3],
            paint: {
              "line-color": "#0b5394",
              "line-width": 3.8,
            },
          },
          firstSymbolId,
        );

        // Distinct Hovered Kecamatan Ring
        map.addLayer(
          {
            id: "kecamatan-hover-line",
            type: "line",
            source: "malang-kecamatan",
            filter: ["==", ["get", "adm3"], ""],
            paint: {
              "line-color": "#0f1e26",
              "line-width": 2.8,
            },
          },
          firstSymbolId,
        );

        // Kelurahan/Desa Pins on top of everything when zoomed
        map.addSource("malang-desa-pins", {
          type: "geojson",
          data: initialGeoRef.current
            .desaPinsGeoJson as unknown as GeoJsonInput,
        });

        map.addLayer({
          id: "desa-pins-circle",
          type: "circle",
          source: "malang-desa-pins",
          paint: {
            "circle-radius": ["case", ["==", ["get", "isCurrent"], 1], 9, 6.5],
            "circle-color": [
              "case",
              ["==", ["get", "isCurrent"], 1],
              "#0b5394",
              "#ffffff",
            ],
            "circle-stroke-color": [
              "case",
              ["==", ["get", "isCurrent"], 1],
              "#ffffff",
              "#0f1e26",
            ],
            "circle-stroke-width": 2.2,
          },
        });

        map.on("mousemove", "kecamatan-fill", (e: MapLayerMouseEvent) => {
          map.getCanvas().style.cursor = "pointer";
          const feat = e.features?.[0];
          const adm3 = feat?.properties?.adm3 as string | undefined;
          if (!adm3) return;
          const kec = kecByAdm3.get(adm3) ?? null;
          setHoveredKec(kec);
          setCursorPx({ x: e.point.x, y: e.point.y });
        });

        map.on("mouseleave", "kecamatan-fill", () => {
          map.getCanvas().style.cursor = "";
          setHoveredKec(null);
        });

        map.on("mouseenter", "desa-pins-circle", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "desa-pins-circle", () => {
          map.getCanvas().style.cursor = "";
        });

        map.on("click", "desa-pins-circle", (e: MapLayerMouseEvent) => {
          const feat = e.features?.[0];
          const adm4 = feat?.properties?.adm4 as string | undefined;
          if (adm4) {
            e.preventDefault();
            callbacksRef.current.onSelectDesa(adm4);
          }
        });

        map.on("click", "kecamatan-fill", (e: MapLayerMouseEvent) => {
          if (e.defaultPrevented) return;
          const pinHits = map.queryRenderedFeatures(e.point, {
            layers: ["desa-pins-circle"],
          });
          if (pinHits.length > 0) return;

          const feat = e.features?.[0];
          const adm3 = feat?.properties?.adm3 as string | undefined;
          if (!adm3) return;
          const kec = kecByAdm3.get(adm3);
          if (!kec) return;

          const isCoarse =
            typeof window !== "undefined" &&
            window.matchMedia("(pointer: coarse)").matches;

          if (isCoarse) {
            setTouchPinnedKec((prev) => {
              if (prev?.adm3 === kec.adm3) {
                callbacksRef.current.onSelectKecamatan(kec);
                return null;
              }
              setCursorPx({ x: e.point.x, y: e.point.y });
              return kec;
            });
            return;
          }

          setTouchPinnedKec(null);
          callbacksRef.current.onSelectKecamatan(kec);
        });

        map.on("click", (e) => {
          if (e.defaultPrevented) return;
          const hits = map.queryRenderedFeatures(e.point, {
            layers: ["kecamatan-fill", "desa-pins-circle"],
          });
          if (hits.length === 0) {
            setTouchPinnedKec(null);
            callbacksRef.current.onEmptyMapClick?.();
          }
        });

        setMapReady(true);
      });
    }

    bootMap();

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [kecByAdm3]);

  // Update persistent selected highlight + hover ring + fill opacity without remounting
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const kecSource = map.getSource("malang-kecamatan") as
      | GeoJSONSource
      | undefined;
    if (kecSource) {
      kecSource.setData(enrichedGeoJson as unknown as GeoJsonInput);
    }

    const hoverAdm3 = touchPinnedKec?.adm3 ?? hoveredKec?.adm3 ?? "";

    if (map.getLayer("kecamatan-selected-halo")) {
      map.setFilter("kecamatan-selected-halo", [
        "==",
        ["get", "adm3"],
        selectedAdm3,
      ]);
    }
    if (map.getLayer("kecamatan-selected-line")) {
      map.setFilter("kecamatan-selected-line", [
        "==",
        ["get", "adm3"],
        selectedAdm3,
      ]);
    }
    if (map.getLayer("kecamatan-hover-line")) {
      map.setFilter(
        "kecamatan-hover-line",
        hoverAdm3 && hoverAdm3 !== selectedAdm3
          ? ["==", ["get", "adm3"], hoverAdm3]
          : ["==", ["get", "adm3"], ""],
      );
    }
    if (map.getLayer("kecamatan-fill")) {
      map.setPaintProperty(
        "kecamatan-fill",
        "fill-opacity",
        isZoomed
          ? ["case", ["==", ["get", "adm3"], selectedAdm3], 0.42, 0.15]
          : ["case", ["==", ["get", "adm3"], hoverAdm3], 0.58, 0.4],
      );
    }
  }, [
    mapReady,
    enrichedGeoJson,
    hoveredKec,
    touchPinnedKec,
    isZoomed,
    selectedAdm3,
  ]);

  // Update Desa Pins GeoJSON when zoomed kecamatan changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const pinSource = map.getSource("malang-desa-pins") as
      | GeoJSONSource
      | undefined;
    if (pinSource) {
      pinSource.setData(desaPinsGeoJson as unknown as GeoJsonInput);
    }
  }, [mapReady, desaPinsGeoJson]);

  // Smooth camera flight when zooming or switching regions
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
    const rightPad = drawerOpen && isDesktop ? 464 : 64;

    if (isZoomed && selectedAdm3) {
      const kec = kecByAdm3.get(selectedAdm3);
      if (kec) {
        map.fitBounds(
          [
            [kec.geoBbox[0], kec.geoBbox[1]],
            [kec.geoBbox[2], kec.geoBbox[3]],
          ],
          {
            padding: { top: 120, bottom: 110, left: 56, right: rightPad },
            pitch: is3D ? 40 : 0,
            bearing: is3D ? -6 : 0,
            maxZoom: 12.8,
            duration: prefersReduced ? 0 : 950,
          },
        );
      }
    } else {
      const b = KECAMATAN_MAP.bounds;
      map.fitBounds(
        [
          [b.minLng, b.minLat],
          [b.maxLng, b.maxLat],
        ],
        {
          padding: { top: 108, bottom: 84, left: 48, right: rightPad },
          pitch: is3D ? DEFAULT_PITCH : 0,
          bearing: is3D ? DEFAULT_BEARING : 0,
          duration: prefersReduced ? 0 : 850,
        },
      );
    }
  }, [mapReady, isZoomed, selectedAdm3, drawerOpen, kecByAdm3, is3D]);

  function handleZoomBy(delta: number) {
    const map = mapRef.current;
    if (!map) return;
    map.zoomTo(map.getZoom() + delta, { duration: 260 });
  }

  function handleToggle3D() {
    const map = mapRef.current;
    const next = !is3D;
    setIs3D(next);
    if (map) {
      map.easeTo({
        pitch: next ? (isZoomed ? 40 : DEFAULT_PITCH) : 0,
        bearing: next ? DEFAULT_BEARING : 0,
        duration: 420,
      });
    }
  }

  const activeTooltipKec = touchPinnedKec ?? hoveredKec;

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        data-testid="realistic-malang-map"
        className="h-full w-full"
      />

      {/* Map Camera Controls: Vertically centered on the right edge (and beside the drawer when open) so it NEVER collides with top header chips or bottom legend on any laptop/mobile width! */}
      <fieldset
        aria-label="Kontrol kamera peta"
        className={`fixed top-1/2 right-3 z-20 -translate-y-1/2 flex-col gap-1.5 transition-[right] duration-300 sm:right-4 ${
          drawerOpen
            ? "hidden md:flex md:right-[426px] lg:right-[462px]"
            : "flex"
        }`}
      >
        <button
          type="button"
          onClick={() => handleZoomBy(0.85)}
          aria-label="Perbesar peta"
          className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-lg font-extrabold text-[var(--color-ink)] shadow-md hover:bg-[var(--color-surface-subtle)]"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => handleZoomBy(-0.85)}
          aria-label="Perkecil peta"
          className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-lg font-extrabold text-[var(--color-ink)] shadow-md hover:bg-[var(--color-surface-subtle)]"
        >
          −
        </button>
        <button
          type="button"
          aria-pressed={is3D}
          onClick={handleToggle3D}
          aria-label="Ubah sudut pandang 3D peta"
          className={`flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] border text-xs font-extrabold shadow-md transition-colors ${
            is3D
              ? "border-transparent bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
              : "border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[var(--color-ink)]"
          }`}
        >
          3D
        </button>
      </fieldset>

      {/* Floating Tooltip per Kecamatan */}
      {activeTooltipKec && (
        <MapTooltip
          kecamatan={activeTooltipKec}
          summary={summaryByAdm3.get(activeTooltipKec.adm3)}
          xPx={cursorPx.x}
          yPx={cursorPx.y}
          containerWidth={containerWidth}
          isTouchPinned={touchPinnedKec?.adm3 === activeTooltipKec.adm3}
          onSelect={(kec) => {
            setTouchPinnedKec(null);
            onSelectKecamatan(kec);
          }}
        />
      )}
    </div>
  );
}
