import { recommendationsRequestSchema } from "@/lib/validation";
import { searchPOIsAlongRoute, type OverpassPOI } from "@/lib/overpass";
import { searchPOIsAlongRouteGoogle, type GooglePOI } from "@/lib/google-places";
import {
  createRouteBuffer,
  filterPOIsInBuffer,
  processAndRankPlaces,
} from "@/lib/geo-utils";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// ============================================================
// POST /api/recommendations
// Endpoint orkestrasi: Dual Provider (Google Places & Overpass OSM)
// ============================================================

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`recommendations:${ip}`, 20, 60 * 1000);

  if (!rateLimit.success) {
    return Response.json(
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Terlalu banyak permintaan rekomendasi. Silakan tunggu ${rateLimit.reset} detik.`,
        },
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // Validasi input
    const parsed = recommendationsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: parsed.error.issues.map((i) => i.message).join(", "),
          },
        },
        { status: 400 }
      );
    }

    const { geometry, tolerance_km, place_type, provider } = parsed.data;

    // 1. Buat buffer polygon di sekitar rute (untuk filter akurat)
    const buffer = createRouteBuffer(geometry, tolerance_km);
    const radiusMeters = Math.round(tolerance_km * 1000 * 1.2);

    let rawPOIs: (OverpassPOI | GooglePOI)[] = [];
    let activeProvider: "google" | "osm" = provider;
    let noticeMessage: string | undefined;

    // 2. Ambil POI sesuai provider yang dipilih
    if (provider === "google") {
      const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (googleApiKey) {
        try {
          rawPOIs = await searchPOIsAlongRouteGoogle(
            geometry.coordinates,
            radiusMeters,
            place_type,
            googleApiKey
          );
        } catch (googleErr) {
          console.warn("[/api/recommendations] Google Places error, fallback to OSM:", googleErr);
          noticeMessage = "Google Places mencapai limit atau kendala jaringan, otomatis dialihkan ke OpenStreetMap.";
          activeProvider = "osm";
          rawPOIs = await searchPOIsAlongRoute(
            geometry.coordinates,
            radiusMeters,
            place_type
          );
        }
      } else {
        activeProvider = "osm";
        rawPOIs = await searchPOIsAlongRoute(
          geometry.coordinates,
          radiusMeters,
          place_type
        );
      }
    } else {
      rawPOIs = await searchPOIsAlongRoute(
        geometry.coordinates,
        radiusMeters,
        place_type
      );
    }

    // 3. Filter POI yang benar-benar di dalam polygon buffer
    const filteredPOIs = filterPOIsInBuffer(rawPOIs, buffer);

    // 4. Hitung jarak, detour, skor (dengan bonus rating untuk Google), dan urutkan
    const rankedPlaces = processAndRankPlaces(filteredPOIs, geometry);

    // 5. Filter berdasarkan tipe jika diminta tipe spesifik
    const finalPlaces =
      place_type === "all"
        ? rankedPlaces
        : rankedPlaces.filter((p) => p.type === place_type);

    // 6. Return hasil
    if (finalPlaces.length === 0) {
      return Response.json({
        places: [],
        count: 0,
        provider: activeProvider,
        message:
          noticeMessage ||
          "Tidak ditemukan tempat dalam toleransi yang ditentukan. Coba perbesar nilai toleransi.",
      });
    }

    return Response.json({
      places: finalPlaces,
      count: finalPlaces.length,
      provider: activeProvider,
      message: noticeMessage,
    });
  } catch (error) {
    console.error("[/api/recommendations] Error:", error);

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan tidak terduga";
    const isTimeout = message.includes("Timeout");

    return Response.json(
      {
        error: {
          code: isTimeout ? "UPSTREAM_TIMEOUT" : "RECOMMENDATIONS_ERROR",
          message,
        },
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
