"use client";

import type { Place, RouteData } from "@/lib/types";

// ============================================================
// PlaceDetailCard — Panel detail tempat makan terpilih
// ============================================================

interface PlaceDetailCardProps {
  place: Place;
  route?: RouteData | null;
  onClose: () => void;
}

export default function PlaceDetailCard({
  place,
  route,
  onClose,
}: PlaceDetailCardProps) {
  return (
    <div className="bg-[var(--bg-panel-raised)] border border-[var(--line)] rounded-[6px] p-3.5 animate-slideUp">
      {/* Header */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {place.name}
            </h3>
            <span className="text-[10px] font-mono text-[var(--text-faint)] border border-[var(--line)] px-1.5 py-0.2 rounded-[4px]">
              {place.provider === "google" ? "G-Places" : "OSM"}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[11px] text-[var(--text-muted)]">
            <span>{getPlaceTypeLabel(place.type)}</span>

            {/* Rating */}
            {place.rating !== undefined && (
              <>
                <span className="text-[var(--text-faint)]">·</span>
                <span className="font-mono text-[var(--text-primary)]">
                  ★ {place.rating.toFixed(1)}
                  {place.user_ratings_total !== undefined && (
                    <span className="text-[var(--text-faint)] ml-0.5">
                      ({place.user_ratings_total.toLocaleString("id-ID")})
                    </span>
                  )}
                </span>
              </>
            )}

            {/* Status Buka */}
            {place.open_now !== undefined && (
              <>
                <span className="text-[var(--text-faint)]">·</span>
                <span className={place.open_now ? "text-[var(--accent-route)]" : "text-[var(--accent-error)]"}>
                  {place.open_now ? "Buka" : "Tutup"}
                </span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-[6px] 
                     border border-[var(--line)] hover:bg-[var(--line)] text-[var(--text-muted)] 
                     hover:text-[var(--text-primary)] transition-colors ml-2"
          aria-label="Tutup detail"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
        <div className="bg-[var(--bg-panel)] border border-[var(--line)] rounded-[6px] p-2 text-center">
          <p className="text-[10px] text-[var(--text-muted)] mb-0.5">
            Dari Titik Awal
          </p>
          <p className="font-overpass text-xs font-bold text-[var(--text-primary)]">
            {formatDistance(place.distance_from_origin_m)}
          </p>
        </div>
        <div className="bg-[var(--bg-panel)] border border-[var(--line)] rounded-[6px] p-2 text-center">
          <p className="text-[10px] text-[var(--text-muted)] mb-0.5">
            Menyimpang
          </p>
          <p className="font-overpass text-xs font-bold text-[var(--text-primary)]">
            +{formatDistance(place.detour_distance_m)}
          </p>
        </div>
        <div className="bg-[var(--bg-panel)] border border-[var(--line)] rounded-[6px] p-2 text-center">
          <p className="text-[10px] text-[var(--text-muted)] mb-0.5 truncate" title="Estimasi waktu untuk mencapai dari rute awal">
            Waktu Tempuh
          </p>
          <p className="font-overpass text-xs font-bold text-[var(--text-primary)]">
            {formatTravelTime(place, route)}
          </p>
        </div>
      </div>

      {/* Alamat / Vicinity jika ada */}
      {place.vicinity && (
        <div className="text-xs text-[var(--text-muted)] border-t border-[var(--line)] pt-2 mb-2">
          <span className="line-clamp-2">{place.vicinity}</span>
        </div>
      )}

      {/* Link Google Maps / Navigasi */}
      <div className="flex items-center justify-between pt-1 border-t border-[var(--line)]">
        <span className="text-[10px] font-mono text-[var(--text-faint)]">
          {place.location.lat.toFixed(4)}, {place.location.lng.toFixed(4)}
        </span>

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-[var(--accent-route)] hover:underline font-medium transition-colors"
        >
          Buka di Google Maps →
        </a>
      </div>
    </div>
  );
}

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

/**
 * Estimasi waktu tempuh untuk mencapai tempat tersebut dari titik awal perjalanan
 */
function formatTravelTime(
  place: Place,
  route?: RouteData | null
): string {
  // Total jarak berkendara dari awal rute sampai tiba di tempat
  const distMeters = place.distance_from_origin_m + (place.distance_to_route_m || 0);

  let seconds: number;
  if (route && route.distance_m > 0 && route.duration_s > 0) {
    const avgSpeed = route.distance_m / route.duration_s; // kecepatan rata-rata rute (m/s)
    seconds = distMeters / avgSpeed;
  } else {
    // Estimasi kecepatan rata-rata dalam kota: ~25 km/jam (6.94 m/s)
    seconds = distMeters / 6.94;
  }

  const minutes = Math.max(1, Math.round(seconds / 60));

  if (minutes < 60) {
    return `~${minutes} mnt`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `~${hours} jam`;
  }
  return `~${hours} j ${remainingMins} m`;
}
