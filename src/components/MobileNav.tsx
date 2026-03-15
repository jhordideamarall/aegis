'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Grid, ShoppingCart, Package, FileText, Users, Settings, Bell } from 'react-feather'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Grid },
  { href: '/pos', label: 'POS', icon: ShoppingCart },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/orders', label: 'Orders', icon: FileText },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/feature-updates', label: 'Updates', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings }
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur md:hidden">
      <div
        className="grid grid-cols-7"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          minHeight: 'var(--app-mobile-nav-height)',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 text-[11px] font-medium ${
                isActive ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              <Icon size={18} strokeWidth={2} className={isActive ? 'text-gray-900' : 'text-gray-500'} />
              <span className="mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
