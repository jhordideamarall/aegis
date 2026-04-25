'use client'

import { useAuth } from '@/hooks/useAuth'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("desktop-app-shell min-h-screen bg-slate-50", isStandalone && "desktop-app-shell-standalone")}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block">
        <Sidebar business={business} onLogout={logout} />
      </aside>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Global AI Command Center */}
      <GlobalCommand />

      {/* Fixed floating PWA install prompt — renders outside main so it doesn't affect any page layout */}
      <DesktopPwaInstallBanner />

      {/* Main Content */}
      <PageTransition>
        <main className="app-mobile-nav-offset min-h-screen lg:ml-64">
          {children}
        </main>
      </PageTransition>
    </div>
  )
}
