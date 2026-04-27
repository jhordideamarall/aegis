'use client'

import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface ChartData {
  title?: string
  data: Record<string, string | number>[]
  keys?: string[]
  colors?: string[]
}

const DEFAULT_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

interface Props { attrs: string; content: string }

export function ChartRenderer({ attrs, content }: Props) {
  let parsed: ChartData
  try { parsed = JSON.parse(content) } catch { return <div className="text-xs text-red-400 p-2">Chart: invalid JSON</div> }

  const typeMatch = attrs.match(/type="([^"]+)"/)
  const chartType = typeMatch?.[1] || 'bar'
  const { title, data, keys = ['value'], colors = DEFAULT_COLORS } = parsed

  return (
    <div className="rounded-2xl border border-slate-100 p-4 bg-slate-50/50">
      {title && <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{title}</p>}
      <ResponsiveContainer width="100%" height={220}>
        {chartType === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey={keys[0]} nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        ) : chartType === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />)}
          </LineChart>
        ) : chartType === 'area' ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {keys.map((k, i) => <Area key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} fill={colors[i % colors.length] + '20'} />)}
          </AreaChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {keys.map((k, i) => <Bar key={k} dataKey={k} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />)}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
