'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Sidebar from '@/components/Sidebar'
import MobileNav from '@/components/MobileNav'
import PageTransition from '@/components/PageTransition'
import { GlobalCommand } from '@/components/GlobalCommand'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { business, loading, logout } = useAuth()
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!loading) {
      setIsLoaded(true)
    }
  }, [loading])

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
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block">
        <Sidebar business={business} onLogout={logout} />
      </aside>

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Global AI Command Center */}
      <GlobalCommand />

      {/* Main Content */}
      <PageTransition>
        <main className="app-mobile-nav-offset lg:ml-64 min-h-screen">
          {children}
        </main>
      </PageTransition>
    </div>
  )
}
