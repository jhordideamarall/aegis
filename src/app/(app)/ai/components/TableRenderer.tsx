'use client'

interface TableData { headers: string[]; rows: (string | number)[][] }
interface Props { content: string }

export function TableRenderer({ content }: Props) {
  let parsed: TableData
  try { parsed = JSON.parse(content) } catch { return <div className="text-xs text-red-400 p-2">Table: invalid JSON</div> }
  const { headers, rows } = parsed

  return (
    <div className="rounded-2xl border border-slate-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {headers.map((h, i) => <th key={i} className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
              {row.map((cell, j) => <td key={j} className="px-4 py-2.5 text-[13px] text-slate-700 border-b border-slate-50">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
