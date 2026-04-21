'use client'

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  className?: string
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger 
          render={
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "h-9 justify-start text-left font-bold text-[10px] uppercase tracking-widest border-slate-200 rounded-lg px-3 bg-white hover:bg-slate-50 transition-all shadow-sm",
                !date && "text-slate-400"
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "dd MMM")} - {format(date.to, "dd MMM")}
                  </>
                ) : (
                  format(date.from, "dd MMM")
                )
              ) : (
                <span>Select Range</span>
              )}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={1}
            className="rounded-xl border-none shadow-2xl bg-white"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
