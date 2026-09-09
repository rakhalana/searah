"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { GeocodingResult, Place, PlaceType, POIProvider, SortOption } from "@/lib/types";
import { useRoute } from "@/hooks/useRoute";
import { useRecommendations } from "@/hooks/useRecommendations";
import LocationSearchInput from "@/components/LocationSearchInput";
import ToleranceSlider from "@/components/ToleranceSlider";
import RecommendationList from "@/components/RecommendationList";
import PlaceDetailCard from "@/components/PlaceDetailCard";

// Dynamic import Leaflet MapView (no SSR — Leaflet needs window)
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900/50 rounded-2xl">
      <div className="flex flex-col items-center gap-3">
        <svg
          className="animate-spin h-8 w-8 text-cyan-500"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm text-slate-400">Memuat peta...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  // State lokasi
  const [origin, setOrigin] = useState<GeocodingResult | null>(null);
  const [destination, setDestination] = useState<GeocodingResult | null>(null);

  // Mode pemilihan manual di peta ("origin" | "destination" | null)
  const [pickingMode, setPickingMode] = useState<"origin" | "destination" | null>(null);

  // State kontrol pencarian rekomendasi
  const [toleranceMeters, setToleranceMeters] = useState(250);
  const toleranceKm = toleranceMeters / 1000;
  const [sortBy, setSortBy] = useState<SortOption>("recommendation");
  const [placeType, setPlaceType] = useState<PlaceType>("all");
  const [provider, setProvider] = useState<POIProvider>("google");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // Hooks rute (dengan dukungan rute alternatif ORS)
  const {
    route,
    routes,
    activeRouteIndex,
    setActiveRouteIndex,
    isLoading: isLoadingRoute,
    error: routeError,
    fetchRoute,
  } = useRoute();

  // Hooks rekomendasi (dengan client-side instant filtering & 1x fetch)
  const {
    places,
    isLoading: isLoadingRecs,
    hasFetched,
    error: recsError,
    message: recsMessage,
    fetchRecommendations,
    filterPlaces,
    clearRecommendations,
  } = useRecommendations();

  // Gabungan error
  const error = routeError || recsError;

  // Handler klik langsung di peta
  const handleMapPick = useCallback(
    (coord: { lat: number; lng: number }) => {
      const coordName = `Titik Peta (${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`;

      if (pickingMode === "origin") {
        setOrigin({
          display_name: coordName,
          lat: coord.lat,
          lng: coord.lng,
          type: "manual",
        });
        setPickingMode(null);
      } else if (pickingMode === "destination") {
        setDestination({
          display_name: coordName,
          lat: coord.lat,
          lng: coord.lng,
          type: "manual",
        });
        setPickingMode(null);
      }
    },
    [pickingMode]
  );

  // Handler cari rute
  const handleSearch = useCallback(async () => {
    if (!origin || !destination) return;

    setSelectedPlace(null);
    clearRecommendations();

    await fetchRoute(
      { lat: origin.lat, lng: origin.lng },
      { lat: destination.lat, lng: destination.lng }
    );
  }, [origin, destination, fetchRoute, clearRecommendations]);

  // Handler cari rekomendasi tempat makan (1x usage ke server)
  const handleFindPlaces = useCallback(async () => {
    if (!route) return;
    setSelectedPlace(null);
    await fetchRecommendations(route.geometry, toleranceKm, placeType, provider);
  }, [route, toleranceKm, placeType, provider, fetchRecommendations]);

  // Handler perubahan slider toleransi (filter instan jika sudah pernah fetch)
  const handleToleranceChange = useCallback(
    (meters: number) => {
      setToleranceMeters(meters);
      const km = meters / 1000;
      if (hasFetched) {
        filterPlaces(km, placeType);
      }
    },
    [hasFetched, placeType, filterPlaces]
  );

  // Handler perubahan kategori tempat makan (filter instan jika sudah pernah fetch)
  const handlePlaceTypeChange = useCallback(
    (val: PlaceType) => {
      setPlaceType(val);
      if (hasFetched) {
        filterPlaces(toleranceKm, val);
      }
    },
    [hasFetched, toleranceKm, filterPlaces]
  );

  // Status tombol
  const canSearch = origin && destination && !isLoadingRoute;
  const canFindPlaces = route && !isLoadingRecs;

  // Format info rute aktif
  const routeInfo = useMemo(() => {
    if (!route) return null;
    const distKm = (route.distance_m / 1000).toFixed(1);
    const durMin = Math.ceil(route.duration_s / 60);
    return { distKm, durMin };
  }, [route]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-app)]">
      {/* ==================== SIDEBAR ==================== */}
      <aside className="sidebar-panel w-full md:w-[360px] lg:w-[380px] flex-shrink-0 bg-[var(--bg-panel)] border-r border-[var(--line)] flex flex-col overflow-hidden z-10">
        {/* Brand Header */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[var(--accent-route)] flex items-center justify-center flex-shrink-0">
              <svg
                className="w-4 h-4 text-[#ECEEF0]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </div>
            <div>
              <h1 className="font-overpass text-[19px] font-extrabold text-[var(--text-primary)] leading-none tracking-tight">
                Searah
              </h1>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                Temukan makan di sepanjang rute
              </p>
            </div>
          </div>
        </div>

        {/* Divider hairline */}
        <div className="h-px bg-[var(--line)]" />

        {/* Main interactive form & results — scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-3.5 space-y-3.5">
          {/* 1. LOKASI AWAL & AKHIR */}
          <div className="space-y-2">
            <LocationSearchInput
              label="Awal"
              placeholder="Cari atau pilih di peta…"
              value={origin}
              onSelect={(res) => {
                setOrigin(res);
                setPickingMode(null);
              }}
              icon={
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-route)]" />
              }
              onPickOnMap={() =>
                setPickingMode((prev) => (prev === "origin" ? null : "origin"))
              }
              isPicking={pickingMode === "origin"}
            />

            <LocationSearchInput
              label="Tujuan"
              placeholder="Cari atau pilih di peta…"
              value={destination}
              onSelect={(res) => {
                setDestination(res);
                setPickingMode(null);
              }}
              icon={
                <div className="w-2.5 h-2.5 rounded-full border-2 border-[var(--accent-route)] bg-transparent" />
              }
              onPickOnMap={() =>
                setPickingMode((prev) =>
                  prev === "destination" ? null : "destination"
                )
              }
              isPicking={pickingMode === "destination"}
            />
          </div>

          {/* 2. TOMBOL CARI RUTE */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={!canSearch}
            className="w-full py-2.5 rounded-[6px] font-medium text-xs text-white
                       bg-[var(--accent-route)] hover:bg-[#26754A]
                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingRoute ? "Menghitung rute…" : "Cari Rute"}
          </button>

          {/* 3. PILIHAN / OPSI RUTE & PLAT JARAK/WAKTU */}
          {route && (
            <div className="space-y-2.5 animate-fadeIn">
              {/* Opsi rute jika lebih dari 1 rute */}
              {routes.length > 1 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">
                    Pilihan Rute ({routes.length})
                  </span>
                  <div className="flex flex-col gap-1">
                    {routes.map((r, idx) => {
                      const distKm = (r.distance_m / 1000).toFixed(1);
                      const durMin = Math.ceil(r.duration_s / 60);
                      const isActive = activeRouteIndex === idx;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setActiveRouteIndex(idx);
                            setSelectedPlace(null);
                            clearRecommendations();
                          }}
                          className={`py-2 px-3 rounded-[6px] border text-left flex items-center justify-between transition-colors ${isActive
                              ? "border-l-2 border-l-[var(--accent-route)] bg-[var(--bg-panel-raised)] border-[var(--line)]"
                              : "border-[var(--line)] bg-transparent hover:bg-[var(--bg-panel-raised)]"
                            }`}
                        >
                          <span
                            className={`text-xs truncate ${isActive
                                ? "text-[var(--text-primary)] font-semibold"
                                : "text-[var(--text-muted)]"
                              }`}
                          >
                            {`Rute ${idx + 1}`}
                          </span>
                          <span className="text-[11px] font-mono text-[var(--text-muted)] flex-shrink-0 ml-2">
                            {distKm} km · {durMin} mnt
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Plat Jarak & Waktu (Gaya Rambu Jalan) */}
              {routeInfo && (
                <div className="bg-[var(--bg-panel-raised)] border border-[var(--line)] rounded-[6px] py-2.5 px-3 text-center">
                  <span className="font-overpass text-[24px] font-extrabold text-[var(--text-primary)] tracking-tight">
                    {routeInfo.distKm} km
                  </span>
                  <span className="text-[var(--text-faint)] mx-2 text-base font-bold">
                    ·
                  </span>
                  <span className="font-overpass text-[24px] font-extrabold text-[var(--text-primary)] tracking-tight">
                    {routeInfo.durMin} mnt
                  </span>
                </div>
              )}

              {/* Hairline divider */}
              <div className="h-px bg-[var(--line)]" />

              {/* 4. SUMBER DATA */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[12px] text-[var(--text-muted)]">
                  Sumber data
                </span>
                <div className="inline-flex rounded-[6px] border border-[var(--line)] p-0.5 bg-[var(--bg-panel-raised)]">
                  <button
                    type="button"
                    onClick={() => {
                      setProvider("google");
                      if (hasFetched) clearRecommendations();
                    }}
                    className={`px-2.5 py-1 text-[11px] rounded-[4px] transition-colors ${provider === "google"
                        ? "bg-[var(--line)] text-[var(--text-primary)] font-medium"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                  >
                    Google Places
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProvider("osm");
                      if (hasFetched) clearRecommendations();
                    }}
                    className={`px-2.5 py-1 text-[11px] rounded-[4px] transition-colors ${provider === "osm"
                        ? "bg-[var(--line)] text-[var(--text-primary)] font-medium"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      }`}
                  >
                    OpenStreetMap
                  </button>
                </div>
              </div>

              {/* 5. TOMBOL CARI TEMPAT MAKAN */}
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleFindPlaces}
                  disabled={!canFindPlaces}
                  className="w-full py-2.5 rounded-[6px] font-medium text-xs text-white
                             bg-[var(--accent-route)] hover:bg-[#26754A]
                             disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoadingRecs
                    ? "Mencari tempat makan…"
                    : hasFetched
                      ? "Cari Ulang Tempat Makan"
                      : "Cari Tempat Makan"}
                </button>

                {hasFetched && (
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="text-[var(--accent-route)] font-medium">
                      1x Fetch Aktif · Filter bebas kuota
                    </span>
                    <button
                      type="button"
                      onClick={handleFindPlaces}
                      disabled={isLoadingRecs}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
                    >
                      Refresh Server
                    </button>
                  </div>
                )}
              </div>

              {/* Hairline divider */}
              <div className="h-px bg-[var(--line)]" />

              {/* 6. TOLERANSI DEVIASI */}
              <ToleranceSlider
                value={toleranceMeters}
                onChange={handleToleranceChange}
              />

              {/* 7. JENIS TEMPAT (TAB TEKS MURNI) */}
              <div>
                <div className="flex border-b border-[var(--line)] gap-4 text-xs pt-1">
                  {(
                    [
                      { value: "all", label: "Semua" },
                      { value: "makan", label: "Tempat Makan" },
                      { value: "coffeeshop", label: "Coffeeshop" },
                      { value: "ngopi_hemat", label: "Ngopi Hemat" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handlePlaceTypeChange(opt.value)}
                      className={`pb-1.5 text-xs transition-colors ${placeType === opt.value
                          ? "text-[var(--text-primary)] font-semibold border-b-2 border-[var(--accent-route)] -mb-px"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-[var(--bg-panel-raised)] border border-[var(--accent-error)] text-[var(--accent-error)] rounded-[6px] p-2.5 text-xs animate-slideUp">
              {error}
            </div>
          )}

          {/* Empty State */}
          {recsMessage && places.length === 0 && (
            <div className="bg-[var(--bg-panel-raised)] border border-[var(--line)] text-[var(--text-muted)] rounded-[6px] p-3 text-xs text-center animate-slideUp">
              Belum ada tempat dalam radius {toleranceMeters} meter. Coba perbesar toleransi deviasi.
            </div>
          )}

          {/* 8. DAFTAR REKOMENDASI TEMPAT MAKAN */}
          <RecommendationList
            places={places}
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
            isLoading={isLoadingRecs}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          {/* Detail Card saat tempat dipilih */}
          {selectedPlace && (
            <PlaceDetailCard
              place={selectedPlace}
              route={route}
              onClose={() => setSelectedPlace(null)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-[var(--line)]">
          <p className="text-[10px] text-[var(--text-faint)] text-center">
            Data dari Google Places & OpenStreetMap · Rute oleh OpenRouteService
          </p>
        </div>
      </aside>

      {/* ==================== MAP ==================== */}
      <main className="flex-1 relative">
        {/* Floating Indicator saat mode pemilihan manual di peta aktif */}
        {pickingMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-[var(--bg-panel)] border border-[var(--line)] text-[var(--text-primary)] px-3.5 py-1.5 rounded-[6px] text-xs flex items-center gap-2.5 animate-slideUp shadow-none">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-route)] animate-pulse" />
            <span>
              Klik peta untuk{" "}
              <strong>
                {pickingMode === "origin" ? "Titik Awal" : "Titik Tujuan"}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setPickingMode(null)}
              className="text-[11px] text-[var(--text-muted)] hover:text-white underline ml-1"
            >
              Batal
            </button>
          </div>
        )}

        <MapView
          route={route}
          routes={routes}
          activeRouteIndex={activeRouteIndex}
          onSelectRouteIndex={(idx) => {
            setActiveRouteIndex(idx);
            setSelectedPlace(null);
            clearRecommendations();
          }}
          places={places}
          selectedPlace={selectedPlace}
          onSelectPlace={setSelectedPlace}
          pickingMode={pickingMode}
          onMapPick={handleMapPick}
          originCoord={origin ? { lat: origin.lat, lng: origin.lng } : null}
          destinationCoord={destination ? { lat: destination.lat, lng: destination.lng } : null}
        />

        {/* Empty state overlay — tampil sebelum ada rute dan tidak dalam mode picking */}
        {!route && !isLoadingRoute && !pickingMode && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-3 animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center border border-white/10">
                <svg
                  className="w-8 h-8 text-cyan-500/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-400">
                  Tentukan lokasi awal & tujuan
                </p>
                <p className="text-xs text-slate-600">
                  Ketik nama tempat atau gunakan tombol 📍 Pilih di Peta
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
