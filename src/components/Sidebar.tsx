'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getBusinessDisplayName, getBusinessInitials } from '@/lib/businessBranding'
import {
  LayoutGrid,
  ShoppingCart,
  Package,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Camera,
  ShoppingBag,
  Store
} from 'lucide-react'
import { useState } from 'react'

interface Business {
  id: string
  business_name: string
  subdomain: string
  slug: string
  industry: string
  status: string
  email: string
  phone: string
  address: string
  city: string
  logo_url?: string
  settings: Record<string, any>
}

interface SidebarProps {
  business?: Business | null
  onLogout?: () => void
}

export default function Sidebar({ business, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  
  const coreNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { href: '/pos', label: 'POS Terminal', icon: ShoppingCart },
    { href: '/products', label: 'Inventory', icon: Package },
    { href: '/orders', label: 'Transactions', icon: FileText },
    { href: '/members', label: 'Customers', icon: Users },
    { href: '/feature-updates', label: 'What\'s New', icon: Bell },
  ]

  const integrationNavItems = [
    { href: '/integrations/instagram', label: 'Instagram', icon: Camera },
    { href: '/integrations/shopee', label: 'Shopee', icon: ShoppingBag },
    { href: '/integrations/tiktok', label: 'TikTok Shop', icon: Store },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg border border-slate-100"
      >
        {isOpen ? <X size={20} className="text-slate-900" /> : <Menu size={20} className="text-slate-900" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        bg-white border-r border-slate-100 h-screen w-64 flex flex-col fixed lg:fixed lg:inset-y-0 left-0
        transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-50">
          <div className="flex items-center gap-3 mb-1">
            {business?.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.business_name}
                className="w-9 h-9 rounded-xl object-cover border border-slate-100 bg-white"
              />
            ) : (
              <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
                <span className="text-white font-black text-xs uppercase">
                  {getBusinessInitials(business?.business_name)}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <span className="font-black text-slate-900 truncate block text-sm tracking-tight italic">
                {getBusinessDisplayName(business?.business_name)}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto space-y-8 no-scrollbar">
          {/* Core POS Section */}
          <div className="space-y-1">
            {coreNavItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <li key={item.href} className="list-none">
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={`text-[13px] font-bold ${isActive ? 'tracking-wide' : ''}`}>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </div>

          {/* Business Integrations Section */}
          <div className="space-y-4">
            <div className="px-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100"></div>
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Integrations</span>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>
            
            <div className="space-y-1">
              {integrationNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <li key={item.href} className="list-none">
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      <span className={`text-[13px] font-bold ${isActive ? 'tracking-wide' : ''}`}>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-50 space-y-1">
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
              pathname === '/settings' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Settings size={18} strokeWidth={2} />
            <span className="text-[13px] font-bold">Settings</span>
          </Link>
          <button
            onClick={() => {
              onLogout?.()
              setIsOpen(false)
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all w-full text-left"
          >
            <LogOut size={18} strokeWidth={2} />
            <span className="text-[13px] font-bold">Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
