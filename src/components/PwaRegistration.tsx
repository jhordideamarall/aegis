'use client'

import { useEffect } from 'react'

export function PwaRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (error) {
        console.error('Failed to register service worker:', error)
      }
    }

    registerServiceWorker()
  }, [])

  return null
}
