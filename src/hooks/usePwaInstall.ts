'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

function getStandaloneState() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as NavigatorWithStandalone).standalone === true
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standaloneMedia = window.matchMedia('(display-mode: standalone)')

    const syncStandalone = () => setIsStandalone(getStandaloneState())
    syncStandalone()

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const handleInstalled = () => {
      setDeferredPrompt(null)
      syncStandalone()
    }

    standaloneMedia.addEventListener('change', syncStandalone)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      standaloneMedia.removeEventListener('change', syncStandalone)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) {
      return false
    }

    await deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    setDeferredPrompt(null)

    if (result.outcome === 'accepted') {
      setIsStandalone(true)
      return true
    }

    return false
  }

  return {
    canInstall: deferredPrompt !== null,
    install,
    isStandalone
  }
}
