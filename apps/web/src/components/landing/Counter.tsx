'use client'

import { useEffect, useState, useRef } from 'react'

interface CounterProps {
  value: number
  duration?: number
}

export default function Counter({ value, duration = 800 }: CounterProps) {
  const [count, setCount] = useState(0)
  const hasAnimated = useRef(false)
  const prevValue = useRef(value)

  useEffect(() => {
    // Reset animation if value changes significantly
    if (value !== prevValue.current && value > 0) {
      hasAnimated.current = false
      prevValue.current = value
    }

    // Start animation immediately
    if (!hasAnimated.current && value > 0) {
      hasAnimated.current = true

      const startTime = Date.now()

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
  }, [value, duration])

  return (
    <span>
      {count.toLocaleString('id-ID')}
    </span>
  )
}
