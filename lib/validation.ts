import { z } from "zod";

// ============================================================
// Zod schemas untuk validasi input di setiap API endpoint
// ============================================================

/** Schema koordinat */
const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Schema query geocoding: GET /api/geocode?q=... */
export const geocodeQuerySchema = z.object({
  q: z
    .string()
    .min(2, "Query pencarian minimal 2 karakter")
    .max(100, "Query pencarian maksimal 100 karakter"),
});

/** Schema request routing: POST /api/routes */
export const routeRequestSchema = z.object({
  origin: coordinateSchema,
  destination: coordinateSchema,
});

/** Schema request recommendations: POST /api/recommendations */
export const recommendationsRequestSchema = z.object({
  geometry: z.object({
    type: z.literal("LineString"),
    coordinates: z.array(z.array(z.number()).length(2)).min(2),
  }),
  tolerance_km: z.number().min(0.01).max(10).default(0.25),
  place_type: z
    .enum(["all", "makan", "coffeeshop", "ngopi_hemat"])
    .default("all"),
  provider: z.enum(["google", "osm"]).default("google"),
});

/** Validasi environment variables saat startup */
export const envSchema = z.object({
  OPENROUTESERVICE_API_KEY: z.string().min(1, "ORS API key wajib diisi"),
  NOMINATIM_USER_AGENT: z.string().min(1, "Nominatim User-Agent wajib diisi"),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
});

/** Tipe hasil validasi environment */
export type ValidatedEnv = z.infer<typeof envSchema>;

/** Validasi dan kembalikan env yang sudah tervalidasi */
export function getValidatedEnv(): ValidatedEnv {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      `Environment variable tidak valid:\n${result.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`
    );
  }
  return result.data;
}
