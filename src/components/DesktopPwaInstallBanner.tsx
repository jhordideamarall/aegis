'use client'

import { useState } from 'react'
import { Download, MonitorSmartphone, Rows3, Sparkles } from 'lucide-react'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { Button } from '@/components/ui/button'

export function DesktopPwaInstallBanner() {
  const { canInstall, install, isStandalone } = usePwaInstall()
  const [isInstalling, setIsInstalling] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  if (isStandalone || isDismissed) {
    return null
  }

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      await install()
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <div className="hidden lg:flex items-center justify-between gap-4 rounded-[28px] border border-slate-200/80 bg-white/88 px-5 py-4 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.5)] backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300/60">
          <MonitorSmartphone size={18} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
            <Sparkles size={12} />
            Desktop App Mode
          </div>
          <p className="text-sm font-semibold text-slate-900">
            Jalankan AEGIS POS sebagai app window desktop tanpa tab dan URL bar.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
              <Rows3 size={12} />
              Workspace lebih fokus
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
              Cocok untuk kasir desktop
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canInstall ? (
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            className="h-10 rounded-2xl bg-slate-950 px-4 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-slate-300/60 hover:bg-slate-800"
          >
            <Download size={14} />
            {isInstalling ? 'Installing...' : 'Install App'}
          </Button>
        ) : (
          <div className="max-w-56 text-right text-xs leading-5 text-slate-500">
            Gunakan menu browser lalu pilih <span className="font-semibold text-slate-700">Install app</span> atau <span className="font-semibold text-slate-700">Create shortcut</span>.
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="rounded-2xl px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          Nanti
        </button>
      </div>
    </div>
  )
}
