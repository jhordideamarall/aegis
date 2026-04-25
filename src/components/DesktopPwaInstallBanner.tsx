'use client'

import { useState, useEffect } from 'react'
import { Download, X, Monitor } from 'lucide-react'
import { usePwaInstall } from '@/hooks/usePwaInstall'

const STORAGE_KEY = 'pwa_banner_date'

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

export function DesktopPwaInstallBanner() {
  const { canInstall, install, isStandalone } = usePwaInstall()
  const [visible, setVisible] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  useEffect(() => {
    if (isStandalone) return
    try {
      const lastShown = localStorage.getItem(STORAGE_KEY)
      if (lastShown !== getTodayDate()) {
        setVisible(true)
      }
    } catch {
      // localStorage unavailable (private mode, etc) — skip banner
    }
  }, [isStandalone])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, getTodayDate())
    } catch { /* ignore */ }
    setVisible(false)
  }

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      await install()
      dismiss()
    } finally {
      setIsInstalling(false)
    }
  }

  if (!visible || isStandalone) return null

  return (
    <div className="fixed bottom-5 left-1/2 z-50 hidden -translate-x-1/2 lg:flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-200/60">
      <Monitor size={15} className="shrink-0 text-slate-400" />
      <p className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
        Install AEGIS POS sebagai app desktop
      </p>
      <div className="h-4 w-px bg-slate-200" />
      {canInstall ? (
        <button
          onClick={handleInstall}
          disabled={isInstalling}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          <Download size={11} />
          {isInstalling ? '...' : 'Install'}
        </button>
      ) : (
        <span className="text-[10px] font-medium text-slate-400">
          Browser menu → <span className="font-semibold text-slate-600">Install app</span>
        </span>
      )}
      <button
        onClick={dismiss}
        aria-label="Tutup"
        className="ml-1 rounded-lg p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500"
      >
        <X size={13} />
      </button>
    </div>
  )
}
