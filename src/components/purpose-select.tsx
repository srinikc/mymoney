"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CUSTOM_PURPOSE_VALUE, PURPOSE_OPTIONS } from "@/shared/purposes"

export function PurposeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isStandard = (PURPOSE_OPTIONS as readonly string[]).includes(value)
  const isCustomValue = value !== "" && !isStandard
  const [customMode, setCustomMode] = useState(isCustomValue)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync custom mode with an externally-set non-standard value (e.g. editing a record)
  useEffect(() => {
    if (isCustomValue) setCustomMode(true)
  }, [isCustomValue])

  const handleSelect = (v: string) => {
    if (v === CUSTOM_PURPOSE_VALUE) {
      setCustomMode(true)
      if (isStandard || value === "") onChange("")
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      setCustomMode(false)
      onChange(v)
    }
  }

  const showInput = customMode
  const selectValue = customMode || isCustomValue ? CUSTOM_PURPOSE_VALUE : value

  return (
    <div>
      <Select value={selectValue} onValueChange={handleSelect}>
        <SelectTrigger><SelectValue placeholder="Select purpose (or type custom)" /></SelectTrigger>
        <SelectContent>
          {(PURPOSE_OPTIONS as readonly string[]).map((p) => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
          <SelectItem value={CUSTOM_PURPOSE_VALUE}>Custom…</SelectItem>
        </SelectContent>
      </Select>
      {showInput && (
        <Input
          ref={inputRef}
          className="mt-2"
          placeholder="Type your own purpose"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  )
}