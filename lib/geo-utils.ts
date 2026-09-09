import * as turf from "@turf/turf";
import type { Place } from "./types";
import type { OverpassPOI } from "./overpass";

// ============================================================
// Fungsi geospasial menggunakan Turf.js
// Buffer, jarak, scoring, ranking
// ============================================================

/**
 * Buat buffer polygon di sekitar garis rute.
 * @param routeGeometry GeoJSON LineString geometry dari rute
 * @param toleranceKm jarak buffer dalam kilometer
 * @returns GeoJSON Feature polygon buffer
 */
export function createRouteBuffer(
  routeGeometry: GeoJSON.LineString,
  toleranceKm: number
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> {
  const line = turf.lineString(routeGeometry.coordinates);
  const buffered = turf.buffer(line, toleranceKm, { units: "kilometers" });
  if (!buffered) {
    throw new Error("Gagal membuat buffer rute");
  }
  return buffered;
}

/**
 * Hitung bbox yang diperbesar dari rute + toleransi.
 * Digunakan untuk query Overpass yang lebih efisien.
 * @returns [south, west, north, east]
 */
export function getExpandedBbox(
  routeGeometry: GeoJSON.LineString,
  toleranceKm: number
): [number, number, number, number] {
  const line = turf.lineString(routeGeometry.coordinates);
  const buffered = turf.buffer(line, toleranceKm + 0.5, {
    units: "kilometers",
  });
  if (!buffered) {
    throw new Error("Gagal menghitung expanded bbox");
  }
  const bbox = turf.bbox(buffered);
  // bbox = [west, south, east, north] (Turf format)
  // Overpass needs [south, west, north, east]
  return [bbox[1], bbox[0], bbox[3], bbox[2]];
}

/**
 * Hitung jarak tegak lurus titik ke garis rute (dalam meter).
 */
export function calculateDistanceToRoute(
  point: { lat: number; lng: number },
  routeGeometry: GeoJSON.LineString
): number {
  const pt = turf.point([point.lng, point.lat]);
  const line = turf.lineString(routeGeometry.coordinates);
  const nearest = turf.nearestPointOnLine(line, pt);
  const distance = turf.distance(pt, nearest, { units: "meters" });
  return Math.round(distance);
}

/**
 * Estimasi tambahan jarak tempuh (detour) untuk mengunjungi sebuah tempat.
 * Dihitung sebagai: jarak(titik rute terdekat → tempat) × 2 (pergi-pulang ke rute).
 * Ini adalah estimasi sederhana tanpa actual routing.
 */
export function calculateDetour(
  point: { lat: number; lng: number },
  routeGeometry: GeoJSON.LineString
): number {
  const distToRoute = calculateDistanceToRoute(point, routeGeometry);
  // Estimasi detour = 2 × jarak ke rute (pergi-pulang)
  // Ditambah faktor 1.3 untuk mempertimbangkan rute jalan yang tidak lurus
  return Math.round(distToRoute * 2 * 1.3);
}

/**
/**
 * Hitung skor tempat berdasarkan kombinasi multi-faktor:
 * 1. Status buka/tutup (open_now)
 * 2. Detour jarak (semakin dekat ke rute = semakin baik)
 * 3. Kualitas rating & jumlah ulasan (rating tinggi dengan banyak ulasan dapat bonus)
 * Skor lebih rendah = lebih direkomendasikan.
 */
export function calculatePlaceScore(
  detourDistanceM: number,
  rating?: number,
  userRatingsTotal?: number,
  openNow?: boolean
): number {
  // 1. Status Operasional: Tempat tutup langsung diberi penalti besar
  let openPenalty = 0.3; // Default netral jika info jam buka tidak tersedia
  if (openNow === true) {
    openPenalty = 0;
  } else if (openNow === false) {
    openPenalty = 10.0; // Turun ke urutan paling bawah
  }

  // 2. Detour Jarak (bobot utama kenyamanan rute): per 1 km detour = +2.5 poin
  const detourKm = detourDistanceM / 1000;
  const detourScore = detourKm * 2.5;

  // 3. Kualitas Tempat: Rating & Jumlah Ulasan
  // Kafe 4.8 dengan 300 ulasan mendapat bonus jauh lebih besar daripada 5.0 dengan 1 ulasan
  let qualityBonus = 0;
  if (rating && rating > 0) {
    const ratingDiff = rating - 3.5;
    const reviews = userRatingsTotal || 0;
    const reviewBonus = Math.min(Math.log10(reviews + 1) * 0.15, 0.5);
    qualityBonus = ratingDiff * 0.3 + reviewBonus;
  }

  const finalScore = openPenalty + detourScore - qualityBonus;
  return Math.round(finalScore * 100) / 100;
}

/**
 * Filter POI yang berada di dalam polygon buffer rute.
 */
export function filterPOIsInBuffer(
  pois: OverpassPOI[],
  buffer: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
): OverpassPOI[] {
  return pois.filter((poi) => {
    const pt = turf.point([poi.lng, poi.lat]);
    return turf.booleanPointInPolygon(pt, buffer);
  });
}

/**
 * Proses POI mentah menjadi Place dengan kalkulasi jarak dari awal rute, detour, dan skor komposit.
 */
export function processAndRankPlaces(
  pois: (OverpassPOI & {
    provider?: "google" | "osm";
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    open_now?: boolean;
    vicinity?: string;
  })[],
  routeGeometry: GeoJSON.LineString
): Place[] {
  const line = turf.lineString(routeGeometry.coordinates);

  const places: Place[] = pois.map((poi) => {
    const pt = turf.point([poi.lng, poi.lat]);
    const nearest = turf.nearestPointOnLine(line, pt, { units: "meters" });
    const distToRoute = Math.round(turf.distance(pt, nearest, { units: "meters" }));
    const distFromOrigin = Math.round(nearest.properties?.location ?? 0);
    const detour = Math.round(distToRoute * 2 * 1.3);
    const finalScore = calculatePlaceScore(
      detour,
      poi.rating,
      poi.user_ratings_total,
      poi.open_now
    );

    return {
      id: poi.id,
      name: poi.name,
      type: poi.type,
      location: { lat: poi.lat, lng: poi.lng },
      distance_to_route_m: distToRoute,
      detour_distance_m: detour,
      distance_from_origin_m: distFromOrigin,
      score: finalScore,
      provider: poi.provider || "osm",
      rating: poi.rating,
      user_ratings_total: poi.user_ratings_total,
      price_level: poi.price_level,
      open_now: poi.open_now,
      vicinity: poi.vicinity,
      tags: poi.tags,
    };
  });

  // Sort default: Rekomendasi terbaik (skor terendah)
  return places.sort((a, b) => a.score - b.score);
}

/**
 * Helper pengurutan daftar tempat berdasarkan opsi user:
 * - "recommendation": Skor komposit cerdas (Buka > Detour Minimal > Rating Bagus)
 * - "route_order": Kronologis sepanjang jalan (dari titik awal ke tujuan)
 * - "detour": Jarak tambahan terkecil (paling menempel rute)
 * - "rating": Rating & ulasan tertinggi
 */
export function sortPlaces(
  places: Place[],
  sortBy: import("./types").SortOption = "recommendation"
): Place[] {
  const list = [...places];
  switch (sortBy) {
    case "route_order":
      return list.sort((a, b) => a.distance_from_origin_m - b.distance_from_origin_m);
    case "detour":
      return list.sort((a, b) => a.detour_distance_m - b.detour_distance_m);
    case "rating":
      return list.sort((a, b) => {
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return (b.user_ratings_total || 0) - (a.user_ratings_total || 0);
      });
    case "recommendation":
    default:
      return list.sort((a, b) => a.score - b.score);
  }
}
