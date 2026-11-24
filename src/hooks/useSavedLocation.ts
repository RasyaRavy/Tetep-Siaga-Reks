"use client";

import { useCallback, useEffect, useState } from "react";
import { getRegionByAdm4 } from "@/lib/regions";
import type { Region } from "@/types";

export const SAVED_LOCATION_STORAGE_KEY = "tsr:saved-adm4";

export function useSavedLocation() {
  const [savedRegion, setSavedRegion] = useState<Region | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVED_LOCATION_STORAGE_KEY);
      if (raw) {
        const found = getRegionByAdm4(raw);
        if (found) {
          setSavedRegion(found);
        }
      }
    } catch {
      // Ignore storage access errors in private/restricted browsers
    }
  }, []);

  const saveAdm4 = useCallback((adm4: string) => {
    const found = getRegionByAdm4(adm4);
    if (!found) return;
    setSavedRegion(found);
    try {
      window.localStorage.setItem(SAVED_LOCATION_STORAGE_KEY, found.adm4);
    } catch {
      // Ignore quota/storage errors
    }
  }, []);

  const clearSavedAdm4 = useCallback(() => {
    setSavedRegion(null);
    try {
      window.localStorage.removeItem(SAVED_LOCATION_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  return {
    savedRegion,
    saveAdm4,
    clearSavedAdm4,
  };
}
