"use client";

import { useState, useCallback } from "react";
import type { Place, PlaceType, POIProvider } from "@/lib/types";

// ============================================================
// Hook untuk fetch rekomendasi tempat makan dari /api/recommendations
// ============================================================

interface UseRecommendationsReturn {
  places: Place[];
  allPlaces: Place[];
  count: number;
  provider: POIProvider;
  isLoading: boolean;
  hasFetched: boolean;
  error: string | null;
  message: string | null;
  fetchRecommendations: (
    geometry: GeoJSON.LineString,
    toleranceKm: number,
    placeType?: PlaceType,
    provider?: POIProvider
  ) => Promise<void>;
  filterPlaces: (toleranceKm: number, placeType: PlaceType) => void;
  clearRecommendations: () => void;
}

export function useRecommendations(): UseRecommendationsReturn {
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [count, setCount] = useState(0);
  const [provider, setProvider] = useState<POIProvider>("google");
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Client-side filtering instan dari allPlaces yang sudah di-fetch
  const filterPlaces = useCallback(
    (toleranceKm: number, placeType: PlaceType) => {
      setAllPlaces((currentAll) => {
        if (currentAll.length === 0) return currentAll;

        const maxMeters = toleranceKm * 1000;
        const filtered = currentAll.filter((place) => {
          const matchType = placeType === "all" || place.type === placeType;
          const matchDistance = place.distance_to_route_m <= maxMeters;
          return matchType && matchDistance;
        });

        setPlaces(filtered);
        setCount(filtered.length);
        return currentAll;
      });
    },
    []
  );

  // Fetch ke server — hanya dipanggil 1 kali per rute
  const fetchRecommendations = useCallback(
    async (
      geometry: GeoJSON.LineString,
      toleranceKm: number,
      placeType: PlaceType = "all",
      requestedProvider: POIProvider = "google"
    ) => {
      setIsLoading(true);
      setError(null);
      setMessage(null);

      try {
        // Ambil dengan toleransi yang memadai (minimal 3 km atau toleransi terpilih)
        // dan place_type 'all' agar bisa difilter di client secara lengkap
        const fetchTolerance = Math.max(toleranceKm, 3);

        const response = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            geometry,
            tolerance_km: fetchTolerance,
            place_type: "all",
            provider: requestedProvider,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error?.message || "Gagal mengambil rekomendasi tempat makan"
          );
        }

        const rawList: Place[] = data.places || [];
        setAllPlaces(rawList);
        setProvider(data.provider || requestedProvider);
        setHasFetched(true);

        if (data.message) {
          setMessage(data.message);
        }

        // Terapkan filter awal sesuai toleransi dan placeType yang diminta pengguna
        const maxMeters = toleranceKm * 1000;
        const initialFiltered = rawList.filter((place) => {
          const matchType = placeType === "all" || place.type === placeType;
          const matchDistance = place.distance_to_route_m <= maxMeters;
          return matchType && matchDistance;
        });

        setPlaces(initialFiltered);
        setCount(initialFiltered.length);
      } catch (err) {
        const errMessage =
          err instanceof Error ? err.message : "Terjadi kesalahan";
        setError(errMessage);
        setPlaces([]);
        setAllPlaces([]);
        setCount(0);
        setHasFetched(false);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearRecommendations = useCallback(() => {
    setPlaces([]);
    setAllPlaces([]);
    setCount(0);
    setHasFetched(false);
    setError(null);
    setMessage(null);
  }, []);

  return {
    places,
    allPlaces,
    count,
    provider,
    isLoading,
    hasFetched,
    error,
    message,
    fetchRecommendations,
    filterPlaces,
    clearRecommendations,
  };
}
