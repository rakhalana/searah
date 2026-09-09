import type { RouteData, Coordinate } from "./types";
import { getValidatedEnv } from "./validation";

// ============================================================
// Client wrapper untuk OpenRouteService routing API
// Multi-Route Generator: Menjamin minimal 2 opsi rute berbeda
// (Rute Tercepat, Rute Alternatif Arteri, & Rute Jarak Terpendek)
// ============================================================

const ORS_BASE_URL = "https://api.openrouteservice.org/v2";

/**
 * Estimasi jarak garis lurus (Haversine) antara dua koordinat dalam kilometer
 */
function estimateDistanceKm(c1: Coordinate, c2: Coordinate): number {
  const R = 6371; // Jari-jari bumi dalam km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Cek apakah dua rute berbeda secara signifikan (jarak beda > 500m atau durasi beda > 90s)
 */
function isDistinctRoute(
  r1: RouteData,
  r2DistanceM: number,
  r2DurationS: number
): boolean {
  const distDiff = Math.abs(r1.distance_m - r2DistanceM);
  const durDiff = Math.abs(r1.duration_s - r2DurationS);
  return distDiff > 500 || durDiff > 90;
}

/**
 * Menghitung titik koordinat waypoint tegak lurus (perpendicular offset)
 * dari garis lurus origin -> destination untuk memaksa rute alternatif jika diperlukan.
 */
function computePerpendicularWaypoint(
  origin: Coordinate,
  destination: Coordinate,
  midpoint: Coordinate,
  offsetKm: number,
  direction: 1 | -1 = 1
): Coordinate {
  const dLng = destination.lng - origin.lng;
  const dLat = destination.lat - origin.lat;
  const length = Math.sqrt(dLng * dLng + dLat * dLat);
  if (length === 0) return midpoint;

  // Vektor normal tegak lurus
  const perpLng = (-dLat / length) * direction;
  const perpLat = (dLng / length) * direction;

  const degLat = offsetKm / 111;
  const degLng = offsetKm / (111 * Math.cos((midpoint.lat * Math.PI) / 180));

  return {
    lat: midpoint.lat + perpLat * degLat,
    lng: midpoint.lng + perpLng * degLng,
  };
}

/**
 * Hitung rute perjalanan antara dua koordinat.
 * Menjamin tersedianya minimal 2 rute berbeda untuk perjalanan antarkota/jarak jauh.
 */
export async function getRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<RouteData[]> {
  const env = getValidatedEnv();
  const straightDistanceKm = estimateDistanceKm(origin, destination);

  // ORS membatasi algoritma alternative_routes bawaan maksimal rute 100 km.
  const allowOrsAlternativeAlgo = straightDistanceKm < 85;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    // 1. Query 1: Rute Tercepat / Rekomendasi Standar
    const standardPayload: {
      coordinates: number[][];
      instructions: boolean;
      alternative_routes?: { target_count: number; share_factor: number };
    } = {
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      ],
      instructions: false,
    };

    if (allowOrsAlternativeAlgo) {
      standardPayload.alternative_routes = {
        target_count: 2,
        share_factor: 0.7,
      };
    }

    // 2. Query 2: Rute Alternatif (Menghindari Tol / Arteri)
    const nonTollPayload = {
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      ],
      options: {
        avoid_features: ["tollways"],
      },
      instructions: false,
    };

    // 3. Query 3: Rute Alternatif (Jarak Terpendek / Shortest Distance)
    const shortestPayload = {
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      ],
      preference: "shortest",
      instructions: false,
    };

    // 4. Query 4: Rute Alternatif (Menghindari Highways / Jalan Bebas Hambatan)
    const noHighwaysPayload = {
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      ],
      options: {
        avoid_features: ["highways"],
      },
      instructions: false,
    };

    // Eksekusi 4 strategi paralel untuk respons super cepat
    const [standardResult, nonTollResult, shortestResult, noHighwaysResult] =
      await Promise.allSettled([
        fetch(`${ORS_BASE_URL}/directions/driving-car/geojson`, {
          method: "POST",
          headers: {
            Authorization: env.OPENROUTESERVICE_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/geo+json",
          },
          body: JSON.stringify(standardPayload),
          signal: controller.signal,
        }).then(async (r) => {
          if (!r.ok) {
            if (r.status === 400 && allowOrsAlternativeAlgo) {
              delete standardPayload.alternative_routes;
              const retryRes = await fetch(
                `${ORS_BASE_URL}/directions/driving-car/geojson`,
                {
                  method: "POST",
                  headers: {
                    Authorization: env.OPENROUTESERVICE_API_KEY,
                    "Content-Type": "application/json",
                    Accept: "application/geo+json",
                  },
                  body: JSON.stringify(standardPayload),
                  signal: controller.signal,
                }
              );
              if (retryRes.ok) return retryRes.json();
            }
            const text = await r.text();
            throw new Error(`Standard route error: ${r.status} ${text}`);
          }
          return r.json();
        }),

        fetch(`${ORS_BASE_URL}/directions/driving-car/geojson`, {
          method: "POST",
          headers: {
            Authorization: env.OPENROUTESERVICE_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/geo+json",
          },
          body: JSON.stringify(nonTollPayload),
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null)),

        fetch(`${ORS_BASE_URL}/directions/driving-car/geojson`, {
          method: "POST",
          headers: {
            Authorization: env.OPENROUTESERVICE_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/geo+json",
          },
          body: JSON.stringify(shortestPayload),
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null)),

        fetch(`${ORS_BASE_URL}/directions/driving-car/geojson`, {
          method: "POST",
          headers: {
            Authorization: env.OPENROUTESERVICE_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/geo+json",
          },
          body: JSON.stringify(noHighwaysPayload),
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null)),
      ]);

    const collectedRoutes: RouteData[] = [];

    // Helper untuk menambah rute jika unik dan berbeda
    const tryAddRoute = (
      feature: {
        geometry: GeoJSON.LineString;
        properties: { summary: { distance: number; duration: number } };
        bbox: number[];
      },
      name: string
    ) => {
      const dist = feature.properties.summary.distance;
      const dur = feature.properties.summary.duration;

      const isDuplicate = collectedRoutes.some(
        (existing) => !isDistinctRoute(existing, dist, dur)
      );

      if (!isDuplicate) {
        collectedRoutes.push({
          name,
          geometry: feature.geometry,
          distance_m: dist,
          duration_s: dur,
          bbox: feature.bbox as [number, number, number, number],
        });
      }
    };

    // 1. Tambahkan rute standar / tercepat
    if (
      standardResult.status === "fulfilled" &&
      standardResult.value?.features?.length > 0
    ) {
      const features = standardResult.value.features;
      features.forEach(
        (
          f: {
            geometry: GeoJSON.LineString;
            properties: { summary: { distance: number; duration: number } };
            bbox: number[];
          },
          idx: number
        ) => {
          tryAddRoute(
            f,
            `Rute ${idx + 1}`
          );
        }
      );
    }

    // 2. Tambahkan rute alternatif non-tol jika ada dan unik
    if (
      nonTollResult.status === "fulfilled" &&
      nonTollResult.value?.features?.length > 0
    ) {
      const nonTollF = nonTollResult.value.features[0];
      tryAddRoute(
        nonTollF,
        `Rute ${collectedRoutes.length + 1}`
      );
    }

    // 3. Tambahkan rute alternatif terpendek jika ada dan unik
    if (
      collectedRoutes.length < 3 &&
      shortestResult.status === "fulfilled" &&
      shortestResult.value?.features?.length > 0
    ) {
      const shortestF = shortestResult.value.features[0];
      tryAddRoute(
        shortestF,
        `Rute ${collectedRoutes.length + 1}`
      );
    }

    // 4. Tambahkan rute alternatif non-highways jika masih butuh opsi
    if (
      collectedRoutes.length < 3 &&
      noHighwaysResult.status === "fulfilled" &&
      noHighwaysResult.value?.features?.length > 0
    ) {
      const noHwF = noHighwaysResult.value.features[0];
      tryAddRoute(
        noHwF,
        `Rute ${collectedRoutes.length + 1}`
      );
    }

    // 5. Fallback Paksa: Jika masih hanya 1 rute dan jarak cukup jauh (>= 10 km),
    // lakukan kalkulasi rute via waypoint lateral (perpendicular offset)
    if (collectedRoutes.length < 2 && straightDistanceKm >= 10) {
      try {
        const route1Coords = collectedRoutes[0]?.geometry.coordinates;
        const midCoord: Coordinate =
          route1Coords && route1Coords.length > 2
            ? {
                lng: route1Coords[Math.floor(route1Coords.length / 2)][0],
                lat: route1Coords[Math.floor(route1Coords.length / 2)][1],
              }
            : {
                lat: (origin.lat + destination.lat) / 2,
                lng: (origin.lng + destination.lng) / 2,
              };

        const offsetKm = Math.min(25, Math.max(8, straightDistanceKm * 0.12));

        // Coba offset arah 1 (+offset)
        const wp1 = computePerpendicularWaypoint(
          origin,
          destination,
          midCoord,
          offsetKm,
          1
        );
        let wpRes = await fetch(
          `${ORS_BASE_URL}/directions/driving-car/geojson`,
          {
            method: "POST",
            headers: {
              Authorization: env.OPENROUTESERVICE_API_KEY,
              "Content-Type": "application/json",
              Accept: "application/geo+json",
            },
            body: JSON.stringify({
              coordinates: [
                [origin.lng, origin.lat],
                [wp1.lng, wp1.lat],
                [destination.lng, destination.lat],
              ],
              radiuses: [-1, -1, -1],
              instructions: false,
            }),
            signal: controller.signal,
          }
        );

        // Jika arah 1 gagal, coba offset arah 2 (-offset)
        if (!wpRes.ok) {
          const wp2 = computePerpendicularWaypoint(
            origin,
            destination,
            midCoord,
            offsetKm,
            -1
          );
          wpRes = await fetch(
            `${ORS_BASE_URL}/directions/driving-car/geojson`,
            {
              method: "POST",
              headers: {
                Authorization: env.OPENROUTESERVICE_API_KEY,
                "Content-Type": "application/json",
                Accept: "application/geo+json",
              },
              body: JSON.stringify({
                coordinates: [
                  [origin.lng, origin.lat],
                  [wp2.lng, wp2.lat],
                  [destination.lng, destination.lat],
                ],
                radiuses: [-1, -1, -1],
                instructions: false,
              }),
              signal: controller.signal,
            }
          );
        }

        if (wpRes.ok) {
          const wpData = await wpRes.json();
          if (wpData.features?.length > 0) {
            tryAddRoute(
              wpData.features[0],
              `Rute ${collectedRoutes.length + 1}`
            );
          }
        }
      } catch (e) {
        console.warn("[getRoute] Waypoint fallback error:", e);
      }
    }

    if (collectedRoutes.length === 0) {
      throw new Error(
        "Gagal menemukan rute untuk perjalanan ini. Pastikan titik awal dan tujuan valid."
      );
    }

    // Urutkan rute: Tercepat pertama, diikuti rute alternatif
    collectedRoutes.sort((a, b) => a.duration_s - b.duration_s);

    // Format penamaan rute yang bersih (Rute 1, Rute 2, Rute 3) sesuai DESIGN.md
    return collectedRoutes.slice(0, 3).map((r, i) => ({
      ...r,
      name: `Rute ${i + 1}`,
    }));
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "Timeout: OpenRouteService tidak merespons dalam 12 detik"
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
