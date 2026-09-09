"use client";

import { useState, useCallback } from "react";
import type { RouteData, Coordinate } from "@/lib/types";

// ============================================================
// Hook untuk fetch rute perjalanan dari /api/routes
// ============================================================

interface UseRouteReturn {
  route: RouteData | null;
  routes: RouteData[];
  activeRouteIndex: number;
  setActiveRouteIndex: (index: number) => void;
  isLoading: boolean;
  error: string | null;
  fetchRoute: (origin: Coordinate, destination: Coordinate) => Promise<void>;
  clearRoute: () => void;
}

export function useRoute(): UseRouteReturn {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const route = routes[activeRouteIndex] || null;

  const fetchRoute = useCallback(
    async (origin: Coordinate, destination: Coordinate) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin, destination }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || "Gagal mengambil data rute");
        }

        if (data.routes && data.routes.length > 0) {
          setRoutes(data.routes);
          setActiveRouteIndex(0);
        } else {
          throw new Error("Tidak ada rute yang ditemukan");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Terjadi kesalahan";
        setError(message);
        setRoutes([]);
        setActiveRouteIndex(0);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearRoute = useCallback(() => {
    setRoutes([]);
    setActiveRouteIndex(0);
    setError(null);
  }, []);

  return {
    route,
    routes,
    activeRouteIndex,
    setActiveRouteIndex,
    isLoading,
    error,
    fetchRoute,
    clearRoute,
  };
}
