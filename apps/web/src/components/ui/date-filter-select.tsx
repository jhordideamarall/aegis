'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

interface DateFilterSelectProps {
  value: { year: string; month: string; week: string; day: string }
  onChange: (value: { year: string; month: string; week: string; day: string }) => void
  availableYears?: number[]
}

const MONTHS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
]

const getWeeksInMonth = (year: number, month: number): string[] => {
  const weeks = ['']
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()
  const totalWeeks = Math.ceil((daysInMonth + firstDay) / 7)
  
  for (let i = 1; i <= totalWeeks; i++) {
    weeks.push(String(i))
  }
  return weeks
}

const getDaysInMonth = (year: number, month: number): string[] => {
  const days = ['']
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(String(i).padStart(2, '0'))
  }
  return days
}

export function DateFilterSelect({ value, onChange, availableYears }: DateFilterSelectProps) {
  const [years, setYears] = useState<number[]>([])
  const [weeks, setWeeks] = useState<string[]>([''])
  const [days, setDays] = useState<string[]>([''])

  useEffect(() => {
    if (!availableYears || availableYears.length === 0) {
      const currentYear = new Date().getFullYear()
      setYears([currentYear, currentYear - 1, currentYear - 2, currentYear - 3])
    } else {
      setYears(availableYears)
    }
  }, [availableYears])

  useEffect(() => {
    if (value.year && value.month) {
      setWeeks(getWeeksInMonth(parseInt(value.year), parseInt(value.month)))
      setDays(getDaysInMonth(parseInt(value.year), parseInt(value.month)))
    } else {
      setWeeks([''])
      setDays([''])
    }
  }, [value.year, value.month])

  const handleYearChange = (year: string | null) => {
    onChange({ year: year || '', month: '', week: '', day: '' })
  }

  const handleMonthChange = (month: string | null) => {
    onChange({ ...value, month: month || '', week: '', day: '' })
  }

  const handleWeekChange = (week: string | null) => {
    onChange({ ...value, week: week || '', day: '' })
  }

  const handleDayChange = (day: string | null) => {
    onChange({ ...value, day: day || '' })
  }

  const getWeekLabel = (weekNum: string) => {
    if (!weekNum) return 'All Weeks'
    return `Week ${weekNum}`
  }

  const getDayLabel = (dayNum: string) => {
    if (!dayNum) return 'All Days'
    const date = new Date(parseInt(value.year), parseInt(value.month) - 1, parseInt(dayNum))
    return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
  }

  const currentFilterText = () => {
    if (!value.year) return 'All Time'
    const yearLabel = value.year
    const monthLabel = value.month ? MONTHS.find(m => m.value === value.month)?.label?.replace('All Year', '') : ''
    const weekLabel = value.week ? `, Week ${value.week}` : ''
    const dayLabel = value.day ? `, ${value.day}` : ''
    return `${yearLabel}${monthLabel}${weekLabel}${dayLabel}`
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value.year} onValueChange={handleYearChange}>
        <SelectTrigger className="h-9 w-[100px] text-xs font-bold bg-white rounded-lg border-slate-200">
          <SelectValue placeholder="Tahun" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="" className="text-xs">All Time</SelectItem>
          {years.map(y => (
            <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.month} onValueChange={handleMonthChange} disabled={!value.year}>
        <SelectTrigger className="h-9 w-[130px] text-xs font-bold bg-white rounded-lg border-slate-200">
          <SelectValue placeholder="Bulan" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map(m => (
            <SelectItem key={m.value} value={m.value} className="text-xs" disabled={m.value === '' && !value.year}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.week} onValueChange={handleWeekChange} disabled={!value.month}>
        <SelectTrigger className="h-9 w-[110px] text-xs font-bold bg-white rounded-lg border-slate-200">
          <SelectValue placeholder="Minggu" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="" className="text-xs">All Weeks</SelectItem>
          {weeks.filter(w => w).map(w => (
            <SelectItem key={w} value={w} className="text-xs">{getWeekLabel(w)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.day} onValueChange={handleDayChange} disabled={!value.week}>
        <SelectTrigger className="h-9 w-[130px] text-xs font-bold bg-white rounded-lg border-slate-200">
          <SelectValue placeholder="Tanggal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="" className="text-xs">All Days</SelectItem>
          {days.filter(d => d).map(d => (
            <SelectItem key={d} value={d} className="text-xs">{getDayLabel(d)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(value.year || value.month || value.week || value.day) && (
        <button
          onClick={() => onChange({ year: '', month: '', week: '', day: '' })}
          className="h-9 px-3 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  )
}