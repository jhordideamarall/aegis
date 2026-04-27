'use client'

import { useEffect, useRef, useState } from 'react'

interface Props { content: string }

export function MermaidRenderer({ content }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    import('mermaid').then(m => {
      m.default.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' })
      const id = `mermaid-${Math.random().toString(36).slice(2)}`
      m.default.render(id, content).then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg
      }).catch(() => setError(true))
    })
  }, [content])

  if (error) return <div className="text-xs text-red-400 p-2">Diagram: gagal dirender</div>

  return <div ref={ref} className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50 overflow-auto [&_svg]:max-w-full" />
}
