"use client";

import { useCallback, useState } from "react";
import { findNearestRegion } from "@/lib/regions";
import type { Region } from "@/types";

export type GeolocationStatus = "idle" | "locating" | "error";

export interface GeolocationMatch {
  region: Region;
  distanceKm: number;
  matchedByPolygon: boolean;
  accuracyMeters: number;
}

export function useGeolocation() {
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    setStatus((prev) => (prev === "error" ? "idle" : prev));
  }, []);

  const locateNearestRegion = useCallback(
    (onFound: (match: GeolocationMatch) => void) => {
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        setStatus("error");
        setErrorMessage(
          "Peramban ini belum mendukung deteksi lokasi otomatis. Silakan cari nama kecamatan.",
        );
        return;
      }

      setStatus("locating");
      setErrorMessage(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const match = findNearestRegion({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setStatus("idle");
          setErrorMessage(null);
          onFound({
            ...match,
            accuracyMeters: Math.round(pos.coords.accuracy || 0),
          });
        },
        (err) => {
          setStatus("error");
          if (err.code === err.PERMISSION_DENIED) {
            setErrorMessage(
              "Izin lokasi ditolak oleh peramban. Aktifkan akses lokasi atau pilih kecamatan secara manual.",
            );
          } else if (err.code === err.TIMEOUT) {
            setErrorMessage(
              "Waktu deteksi GPS habis. Coba lagi atau ketik nama kecamatan di kolom pencarian.",
            );
          } else {
            setErrorMessage(
              "Posisi perangkat belum dapat dideteksi saat ini. Silakan pilih kecamatan secara manual.",
            );
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 60000,
        },
      );
    },
    [],
  );

  return {
    status,
    errorMessage,
    locateNearestRegion,
    clearError,
  };
}
