'use client'

import { useAuth } from '@/hooks/useAuth'
import Sidebar from '@/components/Sidebar'
import PageTransition from '@/components/PageTransition'
import { GlobalCommand } from '@/components/GlobalCommand'
import { DesktopPwaInstallBanner } from '@/components/DesktopPwaInstallBanner'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { cn } from '@/lib/utils'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { business, loading, logout } = useAuth()
  const { isStandalone } = usePwaInstall()

  return (
    <div className={cn("desktop-app-shell min-h-screen bg-slate-50", isStandalone && "desktop-app-shell-standalone")}>
      <Sidebar business={business} onLogout={logout} isLoading={loading} />

      <GlobalCommand />
      <DesktopPwaInstallBanner />

      <PageTransition>
        <main className="min-h-screen md:ml-52 xl:ml-64">
          {loading ? (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading workspace...</p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </PageTransition>
    </div>
  )
}
