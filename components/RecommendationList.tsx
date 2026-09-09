"use client";

import type { Place, SortOption } from "@/lib/types";
import { sortPlaces } from "@/lib/geo-utils";

// ============================================================
// RecommendationList — Daftar tempat makan/ngopi terurut
// Mendukung sorting multi-faktor & info jarak dari titik awal + detour
// ============================================================

interface RecommendationListProps {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
  isLoading: boolean;
  sortBy?: SortOption;
  onSortChange?: (sort: SortOption) => void;
}

export default function RecommendationList({
  places,
  selectedPlace,
  onSelectPlace,
  isLoading,
  sortBy = "recommendation",
  onSortChange,
}: RecommendationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-1.5 animate-fadeIn">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-3 bg-[var(--bg-panel-raised)] border border-[var(--line)] rounded-[6px] animate-pulse"
          >
            <div className="h-3.5 bg-[var(--line)] rounded w-2/3 mb-2" />
            <div className="h-2.5 bg-[var(--line)] rounded w-1/3 mb-2" />
            <div className="h-2.5 bg-[var(--line)] rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (places.length === 0) {
    return null;
  }

  // Urutkan tempat sesuai opsi yang dipilih
  const sortedPlaces = sortPlaces(places, sortBy);

  return (
    <div className="space-y-0 border-t border-[var(--line)] overflow-y-auto max-h-[calc(100vh-420px)] custom-scrollbar">
      {/* Header bar: count + sort options */}
      <div className="py-2.5 flex items-center justify-between text-[11px] text-[var(--text-muted)] border-b border-[var(--line)]">
        <span>
          <strong className="font-overpass text-[13px] font-bold text-[var(--text-primary)]">
            {places.length}
          </strong>{" "}
          tempat
        </span>

        {/* Sort by dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[var(--text-faint)]">Urutkan:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange?.(e.target.value as SortOption)}
            className="bg-[var(--bg-panel-raised)] border border-[var(--line)] text-[var(--text-primary)] text-[11px] rounded-[4px] px-2 py-0.5 focus:outline-none focus:border-[var(--accent-route)] cursor-pointer"
          >
            <option value="recommendation">Rekomendasi</option>
            <option value="route_order">Jarak dari Titik Awal</option>
            <option value="detour">Jarak Penyimpangan Rute</option>
            <option value="rating">Rating</option>
          </select>
        </div>
      </div>

      {sortedPlaces.map((place, index) => {
        const isSelected = selectedPlace?.id === place.id;

        return (
          <button
            key={place.id}
            type="button"
            onClick={() => onSelectPlace(place)}
            className={`w-full text-left py-2.5 px-3 transition-colors border-b border-[var(--line)] flex items-start gap-2.5 ${isSelected
              ? "bg-[var(--bg-panel-raised)] border-l-2 border-l-[var(--accent-route)] pl-[10px]"
              : "hover:bg-[var(--bg-panel-raised)]"
              }`}
          >
            {/* Rank badge nomor */}
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--accent-food)] text-[#ECEEF0] text-[10px] font-overpass font-extrabold flex items-center justify-center mt-0.5">
              {index + 1}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-1.5 mb-0.5">
                <h4 className="text-[13.5px] font-medium truncate text-[var(--text-primary)]">
                  {place.name}
                </h4>
                {place.rating !== undefined && (
                  <span className="text-[11px] font-mono text-[var(--text-muted)] flex-shrink-0">
                    ★ {place.rating.toFixed(1)}
                    {place.user_ratings_total !== undefined && (
                      <span className="text-[10px] text-[var(--text-faint)] ml-0.5">
                        ({formatCount(place.user_ratings_total)})
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] mb-1 flex-wrap">
                <span>{getPlaceTypeLabel(place.type)}</span>
                {place.open_now !== undefined && (
                  <>
                    <span className="text-[var(--text-faint)]">·</span>
                    <span className={place.open_now ? "text-[var(--accent-route)]" : "text-[var(--accent-error)]"}>
                      {place.open_now ? "Buka" : "Tutup"}
                    </span>
                  </>
                )}
                <span className="text-[var(--text-faint)]">·</span>
                <span className="text-[10px] font-mono text-[var(--text-faint)]">
                  {place.provider === "google" ? "G-Places" : "OSM"}
                </span>
              </div>

              {/* Keterangan teks murni: jarak dari titik awal + detour */}
              <div className="text-[11px] text-[var(--text-muted)] font-mono">
                {formatDistance(place.distance_from_origin_m)} dari titik awal
              </div>
              <div className="text-[11px] text-[var(--text-muted)] font-mono">
                {formatDistance(place.detour_distance_m)} menyimpang dari rute
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Helper functions (Clean text, no emojis)
function getPlaceTypeLabel(type: string): string {
  switch (type) {
    case "makan":
      return "Tempat Makan";
    case "coffeeshop":
      return "Coffeeshop";
    case "ngopi_hemat":
      return "Ngopi Hemat";
    default:
      return "Tempat Makan";
  }
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatCount(count: number): string {
  if (count < 1000) return count.toString();
  return `${(count / 1000).toFixed(1)}k`;
}
