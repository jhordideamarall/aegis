'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getBusinessDisplayName, getBusinessInitials } from '@/lib/businessBranding'
import {
  Grid,
  ShoppingCart,
  Package,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell
} from 'react-feather'
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
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Grid },
    { href: '/pos', label: 'POS', icon: ShoppingCart },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/orders', label: 'Orders', icon: FileText },
    { href: '/members', label: 'Members', icon: Users },
    { href: '/feature-updates', label: 'Updates', icon: Bell },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        {isOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
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
        bg-white border-r border-gray-100 h-screen w-64 flex flex-col fixed lg:fixed lg:inset-y-0 left-0
        transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-3">
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
            <span className="font-semibold text-gray-900 truncate">
              {getBusinessDisplayName(business?.business_name)}
            </span>
          </div>
          {business && (
            <p className="text-sm text-gray-500 truncate">{business.business_name}</p>
          )}
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} strokeWidth={2} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => {
              onLogout?.()
              setIsOpen(false)
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-all w-full text-left"
          >
            <LogOut size={18} strokeWidth={2} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
