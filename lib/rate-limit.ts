// ============================================================
// In-Memory Rate Limiter Sederhana berbasis Sliding Window
// Melindungi endpoint dari spamming dan kepatuhan Fair-Use API eksternal
// ============================================================

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Bersihkan rekaman kedaluwarsa secara berkala setiap 5 menit
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      // Hapus timestamp yang lebih lama dari 10 menit
      const valid = record.timestamps.filter((ts) => now - ts < 10 * 60 * 1000);
      if (valid.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, { timestamps: valid });
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Cek apakah request dari IP / identifier tertentu masih dalam kuota rate limit.
 * 
 * @param key Identifier unik (misal IP address + endpoint name)
 * @param limit Jumlah maksimal request dalam interval waktu
 * @param windowMs Durasi interval dalam milidetik
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { timestamps: [] };

  // Filter hanya timestamp dalam jendela waktu saat ini
  const recentTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (recentTimestamps.length >= limit) {
    const oldestTimestamp = recentTimestamps[0];
    const resetTime = Math.ceil((oldestTimestamp + windowMs - now) / 1000);
    return {
      success: false,
      remaining: 0,
      reset: Math.max(1, resetTime),
    };
  }

  recentTimestamps.push(now);
  rateLimitMap.set(key, { timestamps: recentTimestamps });

  return {
    success: true,
    remaining: limit - recentTimestamps.length,
    reset: Math.ceil(windowMs / 1000),
  };
}

/**
 * Ekstraksi IP client dari headers request Next.js (x-forwarded-for, x-real-ip)
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
