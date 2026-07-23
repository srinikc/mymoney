"use client"

import { useState, useRef, useEffect } from "react"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import "react-day-picker/style.css"

interface DatePickerProps {
  value: string
  onChange: (date: string) => void
  label?: string
}

export default function DatePicker({ value, onChange, label }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = value ? new Date(value + "T00:00:00") : undefined

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={label || "Pick a date"}
        className="w-full justify-start text-left font-normal"
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {selected ? format(selected, "PP") : <span>Pick a date</span>}
      </Button>
      {open && (
        <div className="absolute top-full mt-1 z-50 bg-popover border rounded-md shadow-lg">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, "yyyy-MM-dd"))
                setOpen(false)
              }
            }}
            defaultMonth={selected}
          />
        </div>
      )}
    </div>
  )
}
