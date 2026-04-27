/**
 * Client-side cache with TTL (Time To Live) and max size limit
 * Prevents unbounded memory growth in long-running processes
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

interface CacheConfig {
  defaultTTL: number     // Default TTL in milliseconds (5 minutes)
  maxSize: number        // Maximum number of entries (100)
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100
}

const clientCache = new Map<string, CacheEntry<unknown>>()
let config = { ...DEFAULT_CONFIG }
const PERSISTENT_CACHE_PREFIX = 'aegis-client-cache:'

function getStorage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Configure cache behavior
 * Call this once during app initialization
 */
export function configureCache(newConfig: Partial<CacheConfig>): void {
  config = { ...config, ...newConfig }
}

/**
 * Get value from cache
 * Returns undefined if key doesn't exist or entry has expired
 */
export function getClientCache<T>(key: string): T | undefined {
  const entry = clientCache.get(key)
  
  if (!entry) {
    return undefined
  }
  
  // Check if entry has expired
  if (Date.now() > entry.expiresAt) {
    clientCache.delete(key)
    return undefined
  }
  
  return entry.value as T
}

/**
 * Set value in cache with optional TTL
 * Uses default TTL if not specified
 * Evicts oldest entries if cache is full
 */
export function setClientCache<T>(key: string, value: T, ttl?: number): void {
  // Evict expired entries if cache is full
  if (clientCache.size >= config.maxSize) {
    evictExpiredEntries()
  }
  
  // If still full after eviction, remove oldest entry
  if (clientCache.size >= config.maxSize) {
    const oldestKey = clientCache.keys().next().value
    if (oldestKey) {
      clientCache.delete(oldestKey)
    }
  }
  
  clientCache.set(key, {
    value,
    expiresAt: Date.now() + (ttl ?? config.defaultTTL)
  })
}

/**
 * Get value from persistent storage-backed cache
 * Returns undefined if key doesn't exist, entry expired, or storage unavailable
 */
export function getPersistentClientCache<T>(key: string): T | undefined {
  const storage = getStorage()
  if (!storage) return undefined

  try {
    const raw = storage.getItem(`${PERSISTENT_CACHE_PREFIX}${key}`)
    if (!raw) return undefined

    const entry = JSON.parse(raw) as CacheEntry<T>

    if (!entry || typeof entry.expiresAt !== 'number') {
      storage.removeItem(`${PERSISTENT_CACHE_PREFIX}${key}`)
      return undefined
    }

    if (Date.now() > entry.expiresAt) {
      storage.removeItem(`${PERSISTENT_CACHE_PREFIX}${key}`)
      return undefined
    }

    return entry.value
  } catch {
    return undefined
  }
}

/**
 * Set value in persistent storage-backed cache with optional TTL
 */
export function setPersistentClientCache<T>(key: string, value: T, ttl?: number): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(
      `${PERSISTENT_CACHE_PREFIX}${key}`,
      JSON.stringify({
        value,
        expiresAt: Date.now() + (ttl ?? config.defaultTTL)
      } satisfies CacheEntry<T>)
    )
  } catch {
    // Ignore storage quota/security failures
  }
}

export function deletePersistentClientCache(key: string): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.removeItem(`${PERSISTENT_CACHE_PREFIX}${key}`)
  } catch {
    // Ignore storage failures
  }
}

/**
 * Delete specific cache entry
 */
export function deleteClientCache(key: string): void {
  clientCache.delete(key)
}

/**
 * Clear all cache entries
 */
export function clearClientCache(): void {
  clientCache.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number
  maxSize: number
  defaultTTL: number
} {
  return {
    size: clientCache.size,
    maxSize: config.maxSize,
    defaultTTL: config.defaultTTL
  }
}

/**
 * Evict all expired entries
 * Returns number of entries removed
 */
export function evictExpiredEntries(): number {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, entry] of clientCache.entries()) {
    if (now > entry.expiresAt) {
      clientCache.delete(key)
      cleaned++
    }
  }
  
  return cleaned
}

/**
 * Cleanup expired entries periodically
 * Call this in development to prevent memory leaks
 */
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const cleaned = evictExpiredEntries()
    if (cleaned > 0) {
      console.log(`[ClientCache] Cleaned up ${cleaned} expired entries`)
    }
  }, 60000) // Every minute
}
