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
  MessageSquare,
  Cpu
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
    { href: '/pos', label: 'POS', icon: ShoppingCart },
    { href: '/products', label: 'Inventory', icon: Package },
    { href: '/orders', label: 'Transactions', icon: FileText },
    { href: '/members', label: 'Customers', icon: Users },
    { href: '/feature-updates', label: 'What\'s New', icon: Bell },
  ]

  const integrationNavItems = [
    { href: '/integrations/instagram', label: 'Instagram' },
    { href: '/integrations/shopee', label: 'Shopee' },
    { href: '/integrations/tiktok', label: 'TikTok Shop' },
  ]

  const aiNavItems = [
    { href: '/ai/chat', label: 'ChatAegis', icon: MessageSquare, badge: 'Beta' },
    { href: '/ai/mcp', label: 'MCP Server', icon: Cpu },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        {isOpen ? <X size={20} className="text-slate-900" /> : <Menu size={20} className="text-slate-900" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        bg-white border-r border-slate-100 h-screen w-64 flex flex-col fixed lg:fixed lg:inset-y-0 left-0
        transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-50 desktop-sidebar-top">
          <div className="flex items-center gap-3">
            {business?.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.business_name}
                className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-white"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {getBusinessInitials(business?.business_name)}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <span className="font-bold text-gray-900 truncate block text-sm">
                {getBusinessDisplayName(business?.business_name)}
              </span>
              {business && (
                <p className="text-[10px] text-gray-500 truncate font-medium uppercase tracking-tight">Active Business</p>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto space-y-8 no-scrollbar pb-10 desktop-sidebar-scroll">
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
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </div>

          {/* Business Integrations Section */}
          <div className="space-y-3">
            <div className="px-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Integrations</p>
            </div>
            
            <div className="space-y-1">
              {integrationNavItems.map((item) => {
                const isActive = pathname === item.href

                return (
                  <li key={item.href} className="list-none">
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </div>
          </div>

          {/* AI Intelligence Section */}
          <div className="space-y-3">
            <div className="px-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Intelligence</p>
            </div>
            
            <div className="space-y-1">
              {aiNavItems.map((item) => {
                const isActive = pathname === item.href

                return (
                  <li key={item.href} className="list-none">
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                      {'badge' in item && item.badge && (
                        <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600">{item.badge}</span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-50 space-y-1 desktop-sidebar-bottom">
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
              pathname === '/settings' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Settings size={18} strokeWidth={2} />
            <span className="text-sm font-medium">Settings</span>
          </Link>
          <button
            onClick={() => {
              onLogout?.()
              setIsOpen(false)
            }}
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 hover:text-rose-600 transition-all w-full text-left"
          >
            <LogOut size={18} strokeWidth={2} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
