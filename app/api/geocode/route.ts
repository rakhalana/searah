import { type NextRequest } from "next/server";
import { geocodeQuerySchema } from "@/lib/validation";
import { searchPlaces } from "@/lib/geocoding";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// ============================================================
// GET /api/geocode?q=...
// Proxy ke Nominatim untuk geocoding (nama tempat → koordinat)
// ============================================================

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`geocode:${ip}`, 45, 60 * 1000);

  if (!rateLimit.success) {
    return Response.json(
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Pencarian terlalu sering. Silakan tunggu ${rateLimit.reset} detik.`,
        },
      },
      { status: 429 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") || "";

    // Validasi input
    const parsed = geocodeQuerySchema.safeParse({ q });
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

    const results = await searchPlaces(parsed.data.q);

    return Response.json({ results });
  } catch (error) {
    console.error("[/api/geocode] Error:", error);

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan tidak terduga";
    const isTimeout = message.includes("Timeout");

    return Response.json(
      {
        error: {
          code: isTimeout ? "UPSTREAM_TIMEOUT" : "GEOCODING_ERROR",
          message,
        },
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
