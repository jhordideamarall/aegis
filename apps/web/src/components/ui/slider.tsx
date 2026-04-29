'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  max?: number
  step?: number
  className?: string
}

export function Slider({ value, onValueChange, max = 100, step = 1, className }: SliderProps) {
  const percentage = (value[0] / max) * 100

  return (
    <div className={cn("relative w-full h-2", className)}>
      <div className="absolute inset-0 bg-gray-200 rounded-full" />
      <div 
        className="absolute h-full bg-indigo-500 rounded-full transition-all"
        style={{ width: `${percentage}%` }}
      />
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => onValueChange([parseInt(e.target.value)])}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  )
}