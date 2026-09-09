import { routeRequestSchema } from "@/lib/validation";
import { getRoute } from "@/lib/routing";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// ============================================================
// POST /api/routes
// Proxy ke OpenRouteService untuk perhitungan rute perjalanan
// ============================================================

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`routes:${ip}`, 30, 60 * 1000);

  if (!rateLimit.success) {
    return Response.json(
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Terlalu banyak permintaan rute. Silakan coba lagi dalam ${rateLimit.reset} detik.`,
        },
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // Validasi input
    const parsed = routeRequestSchema.safeParse(body);
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

    const routes = await getRoute(parsed.data.origin, parsed.data.destination);

    return Response.json({ routes });
  } catch (error) {
    console.error("[/api/routes] Error:", error);

    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan tidak terduga";
    const isTimeout = message.includes("Timeout");

    return Response.json(
      {
        error: {
          code: isTimeout ? "UPSTREAM_TIMEOUT" : "ROUTING_ERROR",
          message,
        },
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
