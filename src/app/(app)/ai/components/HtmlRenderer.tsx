'use client'

import { useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'

interface Props { content: string }

export function HtmlRenderer({ content }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const safe = DOMPurify.sanitize(content)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(`<style>body{font-family:system-ui,sans-serif;font-size:13px;padding:12px;margin:0;color:#1e293b}</style>${safe}`)
    doc.close()
    iframe.style.height = doc.body.scrollHeight + 24 + 'px'
  }, [safe])

  return <iframe ref={iframeRef} sandbox="allow-scripts" className="w-full rounded-2xl border border-slate-100 min-h-[60px]" />
}
