'use client'

import { useEffect, useState, useRef } from 'react'

interface CounterProps {
  value: number
  duration?: number
}

export default function Counter({ value, duration = 2000 }: CounterProps) {
  const [count, setCount] = useState(0)
  const hasAnimated = useRef(false)
  const elementRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true

          const startTime = Date.now()
          const endTime = startTime + duration

          const animate = () => {
            const now = Date.now()
            const progress = Math.min((now - startTime) / duration, 1)

            // Easing function (easeOutExpo)
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)

            setCount(Math.floor(eased * value))

            if (progress < 1) {
              requestAnimationFrame(animate)
            }
          }

          animate()
        }
      },
      { threshold: 0.5 }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [value, duration])

  return (
    <span ref={elementRef}>
      {count.toLocaleString('id-ID')}
    </span>
  )
}
