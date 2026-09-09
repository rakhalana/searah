// ============================================================
// Shared TypeScript types untuk seluruh aplikasi
// ============================================================

/** Representasi koordinat geografis */
export interface Coordinate {
  lat: number;
  lng: number;
}

/** Hasil geocoding dari Nominatim */
export interface GeocodingResult {
  display_name: string;
  lat: number;
  lng: number;
  type: string;
}

/** Data rute dari OpenRouteService */
export interface RouteData {
  geometry: GeoJSON.LineString;
  distance_m: number;
  duration_s: number;
  bbox: [number, number, number, number];
  name?: string;
  is_toll?: boolean;
}

/** Jenis tempat */
export type PlaceType = "all" | "makan" | "coffeeshop" | "ngopi_hemat";

/** Provider data tempat makan */
export type POIProvider = "google" | "osm";

/** Data tempat makan/ngopi (POI) */
export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  location: Coordinate;
  distance_to_route_m: number;
  detour_distance_m: number;
  distance_from_origin_m: number;
  score: number;
  provider?: POIProvider;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  open_now?: boolean;
  vicinity?: string;
  tags?: Record<string, string>;
}

/** Opsi pengurutan daftar tempat */
export type SortOption = "recommendation" | "route_order" | "detour" | "rating";

/** Format response error konsisten di semua endpoint */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/** Response dari /api/geocode */
export interface GeocodeResponse {
  results: GeocodingResult[];
}

/** Request body untuk /api/routes */
export interface RouteRequest {
  origin: Coordinate;
  destination: Coordinate;
}

/** Response dari /api/routes */
export interface RouteResponse {
  routes: RouteData[];
}

/** Request body untuk /api/recommendations */
export interface RecommendationsRequest {
  geometry: GeoJSON.LineString;
  tolerance_km: number;
  place_type?: PlaceType;
  provider?: POIProvider;
}

/** Response dari /api/recommendations */
export interface RecommendationsResponse {
  places: Place[];
  count: number;
  provider?: POIProvider;
  message?: string;
}

/** State aplikasi utama */
export interface AppState {
  origin: GeocodingResult | null;
  destination: GeocodingResult | null;
  route: RouteData | null;
  recommendations: Place[];
  selectedPlace: Place | null;
  toleranceKm: number;
  placeType: PlaceType;
  provider: POIProvider;
  isLoadingRoute: boolean;
  isLoadingRecommendations: boolean;
  error: string | null;
}
