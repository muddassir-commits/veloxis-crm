// lib/rate-limit.ts
// Fully-functional, high-performance in-memory rate limiter to bypass third-party dependencies

interface RateLimitTracker {
  timestamps: number[];
}

const cache = new Map<string, RateLimitTracker>();

// Periodic garbage collection to prevent memory leaks (runs every 5 minutes)
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      // Keep only timestamps within the last 15 minutes
      const activeTimestamps = value.timestamps.filter((t) => now - t < 15 * 60 * 1000);
      if (activeTimestamps.length === 0) {
        cache.delete(key);
      } else {
        cache.set(key, { timestamps: activeTimestamps });
      }
    }
  }, 5 * 60 * 1000);
}

export function checkRateLimit(
  ip: string,
  limit: number,
  windowMs: number
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const key = `${ip}`;

  let tracker = cache.get(key);
  if (!tracker) {
    tracker = { timestamps: [] };
  }

  // Filter timestamps within the current window
  const activeTimestamps = tracker.timestamps.filter((t) => now - t < windowMs);

  if (activeTimestamps.length >= limit) {
    const oldestTimestamp = activeTimestamps[0];
    const resetTime = oldestTimestamp + windowMs;
    
    return {
      success: false,
      limit,
      remaining: 0,
      reset: resetTime,
    };
  }

  activeTimestamps.push(now);
  cache.set(key, { timestamps: activeTimestamps });

  return {
    success: true,
    limit,
    remaining: limit - activeTimestamps.length,
    reset: now + windowMs,
  };
}
