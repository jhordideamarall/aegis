'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ChartRenderer } from './ChartRenderer'
import { MermaidRenderer } from './MermaidRenderer'
import { TableRenderer } from './TableRenderer'
import { HtmlRenderer } from './HtmlRenderer'

type Segment =
  | { type: 'text'; content: string }
  | { type: 'chart'; attrs: string; content: string }
  | { type: 'mermaid'; content: string }
  | { type: 'table'; content: string }
  | { type: 'html'; content: string }

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = []
  const re = /\[(CHART|MERMAID|TABLE|HTML)([^\]]*)\]([\s\S]*?)\[\/\1\]/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: 'text', content: text.slice(last, m.index) })
    const tag = m[1]
    const attrs = m[2]
    const content = m[3].trim()
    if (tag === 'CHART') segments.push({ type: 'chart', attrs: tag + attrs, content })
    else if (tag === 'MERMAID') segments.push({ type: 'mermaid', content })
    else if (tag === 'TABLE') segments.push({ type: 'table', content })
    else if (tag === 'HTML') segments.push({ type: 'html', content })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ type: 'text', content: text.slice(last) })
  return segments
}

interface Props { content: string }

export function OutputRenderer({ content }: Props) {
  const segments = parseSegments(content)

  return (
    <div className="space-y-4">
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return (
            <div key={i} className="prose prose-slate prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match
                    return isInline ? (
                      <code className="bg-slate-100 text-slate-800 rounded px-1 py-0.5 text-[13px] font-mono" {...props}>
                        {children}
                      </code>
                    ) : (
                      <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    )
                  }
                }}
              >
                {seg.content}
              </ReactMarkdown>
            </div>
          )
        }
        if (seg.type === 'chart') return <ChartRenderer key={i} attrs={seg.attrs} content={seg.content} />
        if (seg.type === 'mermaid') return <MermaidRenderer key={i} content={seg.content} />
        if (seg.type === 'table') return <TableRenderer key={i} content={seg.content} />
        if (seg.type === 'html') return <HtmlRenderer key={i} content={seg.content} />
        return null
      })}
    </div>
  )
}
