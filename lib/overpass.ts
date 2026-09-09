import type { PlaceType } from "./types";

// ============================================================
// Overpass API client — query builder + executor
// Mencari restoran/kafe dari data OpenStreetMap
// Menggunakan query 'around' untuk search di sepanjang rute
// ============================================================


/**
 * Bangun Overpass QL query menggunakan `around` filter
 * untuk mencari tempat makan di sepanjang garis rute.
 * Lebih efisien daripada bbox untuk rute panjang.
 * 
 * @param routeCoords Array of [lng, lat] coordinates (GeoJSON format)
 * @param radiusMeters Radius pencarian dalam meter
 * @param placeType jenis tempat yang dicari
 */
export function buildOverpassAroundQuery(
  routeCoords: number[][],
  radiusMeters: number,
  placeType: PlaceType = "all"
): string {
  // Sample route coordinates agar query tidak terlalu besar
  // Overpass bisa lambat dengan terlalu banyak koordinat
  const sampled = sampleCoordinates(routeCoords, 50);

  // Format koordinat untuk Overpass: "lat1,lon1,lat2,lon2,..."
  const coordStr = sampled
    .map((coord) => `${coord[1]},${coord[0]}`) // [lng,lat] → lat,lon
    .join(",");

  const amenityTypes =
    placeType === "all"
      ? '["amenity"~"restaurant|cafe|fast_food"]'
      : placeType === "makan"
        ? '["amenity"~"restaurant|fast_food"]'
        : '["amenity"="cafe"]';

  return `
    [out:json][timeout:25];
    (
      node${amenityTypes}(around:${radiusMeters},${coordStr});
    );
    out body;
  `.trim();
}

/**
 * Legacy bbox query builder — digunakan sebagai fallback
 */
export function buildOverpassQuery(
  bbox: [number, number, number, number],
  placeType: PlaceType = "all"
): string {
  const [south, west, north, east] = bbox;
  const bboxStr = `${south},${west},${north},${east}`;

  const amenityFilters: string[] = [];
  if (placeType === "all") {
    amenityFilters.push(
      `node["amenity"="restaurant"](${bboxStr});`,
      `node["amenity"="cafe"](${bboxStr});`,
      `node["amenity"="fast_food"](${bboxStr});`
    );
  } else if (placeType === "makan") {
    amenityFilters.push(
      `node["amenity"="restaurant"](${bboxStr});`,
      `node["amenity"="fast_food"](${bboxStr});`
    );
  } else {
    // coffeeshop / ngopi_hemat
    amenityFilters.push(`node["amenity"="cafe"](${bboxStr});`);
  }

  return `
    [out:json][timeout:25];
    (
      ${amenityFilters.join("\n      ")}
    );
    out body;
  `.trim();
}

/** Raw Overpass node element */
interface OverpassElement {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

/** Hasil parsing dari Overpass API */
export interface OverpassPOI {
  id: string;
  name: string;
  type: PlaceType;
  lat: number;
  lng: number;
  tags: Record<string, string>;
}

/**
 * Cari POI tempat makan di sepanjang rute menggunakan Overpass `around` query.
 * Lebih optimal untuk rute panjang dibanding bbox.
 * 
 * @param routeCoords Array of [lng, lat] dari geometry rute
 * @param radiusMeters Radius pencarian dalam meter
 * @param placeType jenis tempat
 */
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const DEFAULT_USER_AGENT = "Searah/1.0 (https://github.com/searah; contact@searah.local)";

/**
 * Cari POI tempat makan di sepanjang rute menggunakan Overpass `around` query.
 * Lebih optimal untuk rute panjang dibanding bbox.
 * 
 * @param routeCoords Array of [lng, lat] dari geometry rute
 * @param radiusMeters Radius pencarian dalam meter
 * @param placeType jenis tempat
 */
export async function searchPOIsAlongRoute(
  routeCoords: number[][],
  radiusMeters: number,
  placeType: PlaceType = "all"
): Promise<OverpassPOI[]> {
  const query = buildOverpassAroundQuery(routeCoords, radiusMeters, placeType);
  const userAgent = process.env.NOMINATIM_USER_AGENT || DEFAULT_USER_AGENT;

  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": userAgent,
          "Accept": "application/json, */*",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Overpass] ${endpoint} returned ${response.status}:`, errorText.slice(0, 150));
        lastError = new Error(`Overpass API error (${endpoint}): ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();

      return (data.elements as OverpassElement[])
        .filter((el) => el.tags && el.tags.name)
        .map((el) => ({
          id: `osm-${el.id}`,
          name: el.tags!.name,
          type: mapAmenityToPlaceType(el.tags?.amenity, el.tags!.name),
          lat: el.lat,
          lng: el.lon,
          tags: el.tags || {},
        }));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.warn(`[Overpass] ${endpoint} timed out after 25s, trying next endpoint...`);
        lastError = new Error("Timeout: Overpass API tidak merespons dalam 25 detik");
      } else {
        console.warn(`[Overpass] ${endpoint} failed:`, error instanceof Error ? error.message : error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError || new Error("Semua Overpass API endpoint gagal merespons");
}

/**
 * Legacy: Cari POI tempat makan dalam bbox
 */
export async function searchPOIs(
  bbox: [number, number, number, number],
  placeType: PlaceType = "all"
): Promise<OverpassPOI[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  const userAgent = process.env.NOMINATIM_USER_AGENT || DEFAULT_USER_AGENT;

  try {
    const query = buildOverpassQuery(bbox, placeType);

    const response = await fetch(OVERPASS_ENDPOINTS[0], {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
        "Accept": "application/json, */*",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Overpass API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    return (data.elements as OverpassElement[])
      .filter((el) => el.tags && el.tags.name)
      .map((el) => ({
        id: `osm-${el.id}`,
        name: el.tags!.name,
        type: mapAmenityToPlaceType(el.tags?.amenity, el.tags!.name),
        lat: el.lat,
        lng: el.lon,
        tags: el.tags || {},
      }));
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Timeout: Overpass API tidak merespons dalam 30 detik");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Map amenity tag & nama tempat ke PlaceType */
function mapAmenityToPlaceType(amenity?: string, name?: string): PlaceType {
  if (amenity === "cafe") {
    const lower = (name || "").toLowerCase();
    const isWarkop = ["warkop", "giras", "giraz", "angkringan", "warkonah"].some((kw) =>
      lower.includes(kw)
    );
    return isWarkop ? "ngopi_hemat" : "coffeeshop";
  }
  return "makan";
}

/**
 * Sample koordinat secara merata — ambil max N titik dari array.
 * Selalu menyertakan titik pertama dan terakhir.
 */
function sampleCoordinates(coords: number[][], maxPoints: number): number[][] {
  if (coords.length <= maxPoints) return coords;

  const result: number[][] = [coords[0]];
  const step = (coords.length - 1) / (maxPoints - 1);

  for (let i = 1; i < maxPoints - 1; i++) {
    const idx = Math.round(i * step);
    result.push(coords[idx]);
  }

  result.push(coords[coords.length - 1]);
  return result;
}
