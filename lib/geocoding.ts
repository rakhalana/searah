import type { GeocodingResult } from "./types";
import { getValidatedEnv } from "./validation";

// ============================================================
// Client wrapper untuk Nominatim geocoding API
// ============================================================

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

/**
 * Cari tempat berdasarkan nama, kembalikan daftar kandidat koordinat.
 * Panggilan ke Nominatim dibatasi ±1 request/detik (fair-use policy).
 */
export async function searchPlaces(query: string): Promise<GeocodingResult[]> {
  const env = getValidatedEnv();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL("/search", NOMINATIM_BASE_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": env.NOMINATIM_USER_AGENT,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Nominatim error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return data.map(
      (item: {
        display_name: string;
        lat: string;
        lon: string;
        type: string;
      }) => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type,
      })
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Timeout: Nominatim tidak merespons dalam 8 detik");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
