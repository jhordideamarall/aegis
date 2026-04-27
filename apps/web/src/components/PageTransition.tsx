'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function PageTransition({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  const pathname = usePathname()
  const [animate, setAnimate] = useState(false)
  const isDashboard = pathname === '/dashboard' || pathname === '/'

  useEffect(() => {
    setAnimate(true)
    const timer = setTimeout(() => setAnimate(false), 240)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div
      className={`page-transition${animate ? ' animate' : ''}${isDashboard ? ' is-dashboard' : ''}${className ? ` ${className}` : ''}`}
    >
      {children}
    </div>
  )
}
