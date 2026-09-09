import type { PlaceType } from "./types";
import type { OverpassPOI } from "./overpass";

// ============================================================
// Google Places API (NearbySearch) client
// Dioptimalkan untuk prioritas jarak rute murni & efisiensi kuota:
// - Menggunakan rankby=distance (bukan prominence/radius)
// - Sampling rute cerdas (2-6 titik strategis)
// - Multi-type fetch paralel (restaurant + cafe)
// - Multi-page fetch paralel untuk cafe (menangkap coffeeshop di balik warkop mikro)
// - Klasifikasi cerdas: "makan", "coffeeshop", "ngopi_hemat"
// ============================================================

const GOOGLE_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

export interface GooglePOI extends OverpassPOI {
  provider: "google";
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  open_now?: boolean;
  vicinity?: string;
}

interface RawGooglePlace {
  place_id: string;
  name: string;
  business_status?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  icon_mask_base_uri?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
  };
  vicinity?: string;
}

/** Kata kunci penanda warkop / giras / angkringan pinggir jalan khas Indonesia */
const WARKOP_KEYWORDS = ["warkop", "giras", "giraz", "angkringan", "warkonah"];

/**
 * Cek apakah nama tempat merupakan warkop / warung kopi merakyat.
 */
export function isWarkopPlace(name: string): boolean {
  const lower = name.toLowerCase();
  return WARKOP_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Klasifikasi tempat:
 * - Jika restaurant_pinlet / types="restaurant" -> "makan"
 * - Jika cafe_pinlet / types="cafe":
 *     - Jika nama berbau warkop/giras/angkringan -> "ngopi_hemat"
 *     - Jika tidak memiliki rating / review -> "ngopi_hemat"
 *     - Selain itu -> "coffeeshop"
 */
export function classifyPlace(
  name: string,
  iconMaskUri?: string,
  types?: string[],
  rating?: number,
  userRatingsTotal?: number
): PlaceType {
  const isCafe =
    iconMaskUri?.endsWith("cafe_pinlet") ||
    types?.includes("cafe");

  if (isCafe) {
    if (isWarkopPlace(name)) return "ngopi_hemat";
    // Kafe tanpa rating atau tanpa ulasan dialihkan ke "ngopi_hemat"
    if (!rating || rating <= 0 || !userRatingsTotal || userRatingsTotal <= 0) {
      return "ngopi_hemat";
    }
    return "coffeeshop";
  }

  return "makan";
}

/**
 * Sample koordinat secara cerdas & hemat kuota:
 * - Rute pendek (<15 km): 2-3 titik
 * - Rute menengah (15-50 km): 3-5 titik
 * - Rute panjang (50-120 km): 6-8 titik
 * - Rute sangat panjang (>120 km): maks 10–12 titik
 */
function sampleRoutePointsQuotaFriendly(
  coords: number[][],
  maxPoints: number
): { lat: number; lng: number }[] {
  if (coords.length <= maxPoints) {
    return coords.map((c) => ({ lat: c[1], lng: c[0] }));
  }

  const result: { lat: number; lng: number }[] = [];
  const step = (coords.length - 1) / (maxPoints - 1);

  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(Math.round(i * step), coords.length - 1);
    result.push({ lat: coords[idx][1], lng: coords[idx][0] });
  }

  return result;
}

/**
 * Tentukan jumlah titik sampling berdasarkan jumlah koordinat rute
 */
function determineSamplingCount(routeCoords: number[][]): number {
  const count = routeCoords.length;
  if (count < 150) return 3;
  if (count < 400) return 5;
  if (count < 900) return 8;
  if (count < 1800) return 10;
  return 12;
}

/**
 * Tentukan Google Places type(s) yang harus di-fetch berdasarkan PlaceType:
 * - "makan"        -> fetch "restaurant"
 * - "coffeeshop"   -> fetch "cafe"
 * - "ngopi_hemat"  -> fetch "cafe"
 * - "all"          -> fetch ["restaurant", "cafe"]
 */
function getGoogleTypesToFetch(placeType: PlaceType): string[] {
  switch (placeType) {
    case "makan":
      return ["restaurant"];
    case "coffeeshop":
    case "ngopi_hemat":
      return ["cafe"];
    case "all":
    default:
      return ["restaurant", "cafe"];
  }
}

/**
 * Fetch satu titik sampling dengan rankby=distance (jarak terdekat murni)
 */
async function fetchPointDistance(
  pt: { lat: number; lng: number },
  googleType: string,
  apiKey: string
): Promise<{ results: RawGooglePlace[]; nextPageToken?: string; googleType: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL(GOOGLE_NEARBY_URL);
    url.searchParams.set("location", `${pt.lat},${pt.lng}`);
    url.searchParams.set("rankby", "distance");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("type", googleType);

    const res = await fetch(url.toString(), {
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[Google Places] HTTP error ${res.status}`);
      return { results: [], googleType };
    }

    const data = await res.json();

    if (data.status === "REQUEST_DENIED" || data.status === "OVER_QUERY_LIMIT") {
      console.warn(`[Google Places] Status warning: ${data.status} - ${data.error_message}`);
      throw new Error(data.error_message || `Google Places API ${data.status}`);
    }

    return {
      results: (data.results as RawGooglePlace[]) || [],
      nextPageToken: data.next_page_token,
      googleType,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch halaman ke-2 menggunakan next_page_token
 */
async function fetchPageByToken(
  token: string,
  apiKey: string
): Promise<RawGooglePlace[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL(GOOGLE_NEARBY_URL);
    url.searchParams.set("pagetoken", token);
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), {
      signal: controller.signal,
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data.results as RawGooglePlace[]) || [];
  } catch (err) {
    console.warn("[Google Places] Gagal mengambil halaman pagination:", err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Cari tempat makan & ngopi di sepanjang koridor rute menggunakan Google Places API.
 * Murni mengutamakan jarak (rankby=distance), pagination untuk cafe, dan klasifikasi 3 kategori.
 */
export async function searchPOIsAlongRouteGoogle(
  routeCoords: number[][],
  radiusMeters: number,
  placeType: PlaceType = "all",
  apiKey: string
): Promise<GooglePOI[]> {
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY tidak dikonfigurasi");
  }

  // 1. Sampling titik rute
  const sampleCount = determineSamplingCount(routeCoords);
  const samplePoints = sampleRoutePointsQuotaFriendly(routeCoords, sampleCount);

  // 2. Tentukan Google type(s) yang perlu di-fetch
  const googleTypes = getGoogleTypesToFetch(placeType);

  // 3. Fetch halaman 1 untuk setiap (titik × type) secara paralel
  const p1Promises: Promise<{
    results: RawGooglePlace[];
    nextPageToken?: string;
    googleType: string;
  }>[] = [];

  for (const pt of samplePoints) {
    for (const gType of googleTypes) {
      p1Promises.push(fetchPointDistance(pt, gType, apiKey));
    }
  }

  const settledP1 = await Promise.allSettled(p1Promises);
  const allResults: RawGooglePlace[] = [];
  const cafeNextTokens: string[] = [];

  for (const item of settledP1) {
    if (item.status === "fulfilled") {
      allResults.push(...item.value.results);
      // Simpan next_page_token khusus cafe agar coffeeshop di belakang warkop tertangkap
      if (item.value.googleType === "cafe" && item.value.nextPageToken) {
        cafeNextTokens.push(item.value.nextPageToken);
      }
    } else {
      console.warn("[Google Places] Request halaman 1 gagal:", item.reason);
    }
  }

  // Jika semua panggilan gagal, lempar error agar route handler bisa fallback ke Overpass
  if (allResults.length === 0 && settledP1.some((s) => s.status === "rejected")) {
    const firstError = settledP1.find((s) => s.status === "rejected") as PromiseRejectedResult;
    throw firstError?.reason || new Error("Gagal mengambil data dari Google Places");
  }

  // 4. Fetch halaman 2 secara paralel jika ada token cafe (menunggu delay 2.1s Google)
  if (cafeNextTokens.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 2100));
    const p2Promises = cafeNextTokens.map((token) => fetchPageByToken(token, apiKey));
    const settledP2 = await Promise.allSettled(p2Promises);

    for (const item of settledP2) {
      if (item.status === "fulfilled") {
        allResults.push(...item.value);
      }
    }
  }

  // 5. Deduplikasi & filter entitas tidak valid
  const seenIds = new Set<string>();
  const uniquePlaces: GooglePOI[] = [];

  for (const place of allResults) {
    if (!place.place_id || seenIds.has(place.place_id)) continue;
    if (!place.geometry?.location) continue;
    if (place.business_status === "CLOSED_PERMANENTLY") continue;

    // Filter pin palsu / placeholder navigasi Google
    const cleanName = place.name?.trim() || "";
    if (!cleanName || cleanName.toLowerCase().includes("taruh gps")) continue;

    seenIds.add(place.place_id);

    // Klasifikasi kategori
    const resolvedType = classifyPlace(
      cleanName,
      place.icon_mask_base_uri,
      place.types,
      place.rating,
      place.user_ratings_total
    );

    // Jika dipanggil dengan filter spesifik (bukan "all"), pastikan tipe sesuai
    if (placeType !== "all" && resolvedType !== placeType) {
      continue;
    }

    uniquePlaces.push({
      id: `google-${place.place_id}`,
      name: cleanName,
      type: resolvedType,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      provider: "google",
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      price_level: place.price_level,
      open_now: place.opening_hours?.open_now,
      vicinity: place.vicinity,
      tags: {
        ...(place.vicinity ? { address: place.vicinity } : {}),
        ...(place.rating ? { rating: place.rating.toString() } : {}),
        ...(place.user_ratings_total ? { user_ratings_total: place.user_ratings_total.toString() } : {}),
      },
    });
  }

  return uniquePlaces;
}
