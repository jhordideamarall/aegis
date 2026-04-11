/**
 * Simple in-memory rate limiter using sliding window algorithm
 * For production use, consider Redis-based rate limiting (e.g., @upstash/ratelimit)
 */

interface RateLimitEntry {
  count: number
  firstRequest: number
}

// In-memory store - in serverless environments, use Redis instead
const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  windowMs: number    // Time window in milliseconds
  maxRequests: number // Maximum requests allowed in window
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

/**
 * Check if request is within rate limit
 * @param key - Unique identifier (e.g., IP address, user ID, API key)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // If no entry or window expired, create new entry
  if (!entry || now - entry.firstRequest >= config.windowMs) {
    rateLimitStore.set(key, {
      count: 1,
      firstRequest: now
    })

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs
    }
  }

  // Window still active
  const remaining = Math.max(0, config.maxRequests - entry.count)
  
  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt: entry.firstRequest + config.windowMs
    }
  }

  // Increment count
  entry.count++
  
  return {
    success: true,
    limit: config.maxRequests,
    remaining: remaining - 1,
    resetAt: entry.firstRequest + config.windowMs
  }
}

/**
 * Clean up expired entries from rate limit store
 * Call this periodically in long-running processes
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()
  let cleaned = 0

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.firstRequest >= 86400000) { // 24 hours
      rateLimitStore.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    console.log(`[RateLimiter] Cleaned up ${cleaned} expired entries`)
  }
}

/**
 * Clear all rate limit entries (use with caution)
 */
export function clearRateLimits(): void {
  rateLimitStore.clear()
}

// Auto-cleanup every hour in long-running processes
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  setInterval(cleanupExpiredEntries, 3600000) // 1 hour
}
