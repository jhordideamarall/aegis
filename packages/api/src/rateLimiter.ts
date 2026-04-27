interface RateLimitEntry {
  count: number
  firstRequest: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now - entry.firstRequest >= config.windowMs) {
    rateLimitStore.set(key, { count: 1, firstRequest: now })
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    }
  }

  const remaining = Math.max(0, config.maxRequests - entry.count)

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt: entry.firstRequest + config.windowMs,
    }
  }

  entry.count++

  return {
    success: true,
    limit: config.maxRequests,
    remaining: remaining - 1,
    resetAt: entry.firstRequest + config.windowMs,
  }
}

export function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.firstRequest >= 86400000) {
      rateLimitStore.delete(key)
    }
  }
}

export function clearRateLimits(): void {
  rateLimitStore.clear()
}

if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  setInterval(cleanupExpiredEntries, 3600000)
}
