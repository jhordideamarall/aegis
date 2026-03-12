const clientCache = new Map<string, any>()

export function getClientCache<T>(key: string): T | undefined {
  return clientCache.get(key)
}

export function setClientCache<T>(key: string, value: T) {
  clientCache.set(key, value)
}
