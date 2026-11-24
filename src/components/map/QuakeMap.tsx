"use client";

import {
  type GeoJSONSource,
  Map as MapLibreMap,
  type StyleSpecification,
  setWorkerUrl,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Quake, Region } from "@/types";

type GeoJsonInput = Parameters<GeoJSONSource["setData"]>[0];

interface QuakeMapProps {
  selectedQuake: Quake;
  allQuakes: Quake[];
  region: Region;
}

const OFFLINE_INDONESIA_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "ocean-bg",
      type: "background",
      paint: { "background-color": "#d8ecfa" },
    },
  ],
};

export function QuakeMap({ selectedQuake, allQuakes, region }: QuakeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const lineGeoJson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [region.lng, region.lat],
              [selectedQuake.lng, selectedQuake.lat],
            ],
          },
        },
      ],
    }),
    [region.lat, region.lng, selectedQuake.lat, selectedQuake.lng],
  );

  const otherQuakesGeoJson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: allQuakes
        .filter((q) => q.id !== selectedQuake.id)
        .slice(0, 15)
        .map((q) => ({
          type: "Feature" as const,
          properties: {
            magnitude: q.magnitude,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [q.lng, q.lat],
          },
        })),
    }),
    [allQuakes, selectedQuake.id],
  );

  const pointsGeoJson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {
            kind: "malang",
            label: `Kec. ${region.kecamatan}`,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [region.lng, region.lat],
          },
        },
        {
          type: "Feature" as const,
          properties: {
            kind: "epicenter",
            severity:
              selectedQuake.magnitude >= 6
                ? "high"
                : selectedQuake.magnitude >= 5
                  ? "mid"
                  : "low",
          },
          geometry: {
            type: "Point" as const,
            coordinates: [selectedQuake.lng, selectedQuake.lat],
          },
        },
      ],
    }),
    [
      region.kecamatan,
      region.lat,
      region.lng,
      selectedQuake.lat,
      selectedQuake.lng,
      selectedQuake.magnitude,
    ],
  );

  const initialDataRef = useRef({
    lineGeoJson,
    otherQuakesGeoJson,
    pointsGeoJson,
    region,
    selectedQuake,
  });
  initialDataRef.current = {
    lineGeoJson,
    otherQuakesGeoJson,
    pointsGeoJson,
    region,
    selectedQuake,
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    async function boot() {
      let resolvedStyle: string | StyleSpecification = OFFLINE_INDONESIA_STYLE;
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
        resolvedStyle = OFFLINE_INDONESIA_STYLE;
      }

      if (cancelled || !containerRef.current) return;

      setWorkerUrl("/maplibre-gl-worker.js");

      const initQ = initialDataRef.current.selectedQuake;
      const initR = initialDataRef.current.region;

      const map = new MapLibreMap({
        container: containerRef.current,
        style: resolvedStyle,
        center: [(initQ.lng + initR.lng) / 2, (initQ.lat + initR.lat) / 2],
        zoom: 4.5,
        minZoom: 2.8,
        maxZoom: 11,
        attributionControl: { compact: true },
      });

      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;

        map.addSource("quake-distance-line", {
          type: "geojson",
          data: initialDataRef.current.lineGeoJson as unknown as GeoJsonInput,
        });

        map.addLayer({
          id: "quake-distance-line-layer",
          type: "line",
          source: "quake-distance-line",
          paint: {
            "line-color": "#0b5394",
            "line-width": 2,
            "line-dasharray": [3, 2],
            "line-opacity": 0.78,
          },
        });

        map.addSource("quake-others", {
          type: "geojson",
          data: initialDataRef.current
            .otherQuakesGeoJson as unknown as GeoJsonInput,
        });

        map.addLayer({
          id: "quake-others-circle",
          type: "circle",
          source: "quake-others",
          paint: {
            "circle-radius": 4,
            "circle-color": "#d97706",
            "circle-opacity": 0.5,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1,
          },
        });

        map.addSource("quake-focus-points", {
          type: "geojson",
          data: initialDataRef.current.pointsGeoJson as unknown as GeoJsonInput,
        });

        map.addLayer({
          id: "quake-epicenter-ring",
          type: "circle",
          source: "quake-focus-points",
          filter: ["==", ["get", "kind"], "epicenter"],
          paint: {
            "circle-radius": 16,
            "circle-color": [
              "match",
              ["get", "severity"],
              "high",
              "#dc2626",
              "mid",
              "#d97706",
              "#0284c7",
            ],
            "circle-opacity": 0.22,
          },
        });

        map.addLayer({
          id: "quake-epicenter-dot",
          type: "circle",
          source: "quake-focus-points",
          filter: ["==", ["get", "kind"], "epicenter"],
          paint: {
            "circle-radius": 7.5,
            "circle-color": [
              "match",
              ["get", "severity"],
              "high",
              "#dc2626",
              "mid",
              "#d97706",
              "#0284c7",
            ],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2.4,
          },
        });

        map.addLayer({
          id: "quake-malang-pin",
          type: "circle",
          source: "quake-focus-points",
          filter: ["==", ["get", "kind"], "malang"],
          paint: {
            "circle-radius": 6,
            "circle-color": "#0b5394",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2.2,
          },
        });

        setMapReady(true);
      });
    }

    boot();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const lineSrc = map.getSource("quake-distance-line") as
      | GeoJSONSource
      | undefined;
    if (lineSrc) {
      lineSrc.setData(lineGeoJson as unknown as GeoJsonInput);
    }

    const othersSrc = map.getSource("quake-others") as
      | GeoJSONSource
      | undefined;
    if (othersSrc) {
      othersSrc.setData(otherQuakesGeoJson as unknown as GeoJsonInput);
    }

    const ptsSrc = map.getSource("quake-focus-points") as
      | GeoJSONSource
      | undefined;
    if (ptsSrc) {
      ptsSrc.setData(pointsGeoJson as unknown as GeoJsonInput);
    }

    const minLng = Math.min(region.lng, selectedQuake.lng);
    const maxLng = Math.max(region.lng, selectedQuake.lng);
    const minLat = Math.min(region.lat, selectedQuake.lat);
    const maxLat = Math.max(region.lat, selectedQuake.lat);

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: { top: 44, right: 34, bottom: 34, left: 34 },
        maxZoom: 7.4,
        duration: prefersReduced ? 0 : 650,
      },
    );
  }, [
    lineGeoJson,
    mapReady,
    otherQuakesGeoJson,
    pointsGeoJson,
    region.lat,
    region.lng,
    selectedQuake.lat,
    selectedQuake.lng,
  ]);

  return (
    <section
      aria-label={`Peta episenter gempa di ${selectedQuake.regionDesc} dan posisi Malang Raya`}
      className="relative h-52 w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[#d8ecfa]"
    >
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute top-2 left-2 flex items-center gap-2.5 rounded-[var(--radius-control)] border border-[var(--color-border-subtle)] bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[var(--color-ink)] shadow-sm">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[#d97706]" />
          <span>Episenter</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[#0b5394]" />
          <span>Malang</span>
        </span>
      </div>
    </section>
  );
}
