"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface FilterBarProps {
  categories: Array<{ id: number; name: string; color?: string }>
  categoryValue: string
  onCategoryChange: (value: string) => void

  distinctVendors: string[]
  vendorValue: string
  onVendorChange: (value: string) => void

  distinctPersons: string[]
  personValue: string
  onPersonChange: (value: string) => void

  distinctPaymentModes: string[]
  paymentModeValue: string
  onPaymentModeChange: (value: string) => void

  distinctBankAccounts: string[]
  bankValue: string
  onBankChange: (value: string) => void

  distinctSubCategories: string[]
  subCategoryValue: string
  onSubCategoryChange: (value: string) => void

  amountMin: string
  amountMax: string
  onAmountMinChange: (value: string) => void
  onAmountMaxChange: (value: string) => void

  distinctRecurrenceTypes: string[]
  recurrenceValue: string
  onRecurrenceChange: (value: string) => void

  onClear: () => void
}

export function FilterBar({
  categories,
  categoryValue,
  onCategoryChange,
  distinctVendors,
  vendorValue,
  onVendorChange,
  distinctPersons,
  personValue,
  onPersonChange,
  distinctPaymentModes,
  paymentModeValue,
  onPaymentModeChange,
  distinctBankAccounts,
  bankValue,
  onBankChange,
  distinctSubCategories,
  subCategoryValue,
  onSubCategoryChange,
  amountMin,
  amountMax,
  onAmountMinChange,
  onAmountMaxChange,
  distinctRecurrenceTypes,
  recurrenceValue,
  onRecurrenceChange,
  onClear,
}: FilterBarProps) {
  const hasActiveFilters =
    categoryValue !== "all" ||
    vendorValue !== "" ||
    personValue !== "all" ||
    paymentModeValue !== "all" ||
    bankValue !== "" ||
    subCategoryValue !== "" ||
    amountMin !== "" ||
    amountMax !== "" ||
    recurrenceValue !== "all"

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2 items-end" data-testid="filter-bar">
      <div className="space-y-0.5">
        <label htmlFor="filter-category" className="text-[10px] font-medium text-muted-foreground">Category</label>
        <Select value={categoryValue} onValueChange={onCategoryChange}>
          <SelectTrigger id="filter-category" className="h-9 text-sm w-32" aria-label="Category">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-0.5">
        <label htmlFor="filter-vendor" className="text-[10px] font-medium text-muted-foreground">Vendor</label>
        <Input
          id="filter-vendor"
          aria-label="Vendor"
          list="fb-vendor-list"
          placeholder="All"
          className="h-9 text-sm w-32"
          value={vendorValue}
          onChange={(e) => onVendorChange(e.target.value)}
        />
        <datalist id="fb-vendor-list">
          {distinctVendors.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </div>

      <div className="space-y-0.5">
        <label htmlFor="filter-person" className="text-[10px] font-medium text-muted-foreground">Person</label>
        <Select value={personValue} onValueChange={onPersonChange}>
          <SelectTrigger id="filter-person" className="h-9 text-sm w-28" aria-label="Person">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {distinctPersons.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-0.5">
        <label htmlFor="filter-mode" className="text-[10px] font-medium text-muted-foreground">Mode</label>
        <Select value={paymentModeValue} onValueChange={onPaymentModeChange}>
          <SelectTrigger id="filter-mode" className="h-9 text-sm w-28" aria-label="Mode">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {distinctPaymentModes.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-0.5">
        <label htmlFor="filter-bank" className="text-[10px] font-medium text-muted-foreground">Bank</label>
        <Input
          id="filter-bank"
          aria-label="Bank"
          list="fb-bank-list"
          placeholder="All"
          className="h-9 text-sm w-32"
          value={bankValue}
          onChange={(e) => onBankChange(e.target.value)}
        />
        <datalist id="fb-bank-list">
          {distinctBankAccounts.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </div>

      <div className="space-y-0.5">
        <label className="text-[10px] font-medium text-muted-foreground">Amount</label>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            placeholder="Min"
            aria-label="Amount-min"
            className="h-9 text-sm w-20"
            value={amountMin}
            onChange={(e) => onAmountMinChange(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">&mdash;</span>
          <Input
            type="number"
            placeholder="Max"
            aria-label="Amount-max"
            className="h-9 text-sm w-20"
            value={amountMax}
            onChange={(e) => onAmountMaxChange(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-0.5">
        <label htmlFor="filter-type" className="text-[10px] font-medium text-muted-foreground">Type</label>
        <Select value={recurrenceValue} onValueChange={onRecurrenceChange}>
          <SelectTrigger id="filter-type" className="h-9 text-sm w-28" aria-label="Type">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {distinctRecurrenceTypes.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-0.5">
        <label htmlFor="filter-subcat" className="text-[10px] font-medium text-muted-foreground">Sub Cat</label>
        <Input
          id="filter-subcat"
          aria-label="Sub Cat"
          list="fb-subcat-list"
          placeholder="All"
          className="h-9 text-sm w-28"
          value={subCategoryValue}
          onChange={(e) => onSubCategoryChange(e.target.value)}
        />
        <datalist id="fb-subcat-list">
          {distinctSubCategories.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      {hasActiveFilters && (
        <div className="space-y-0.5">
          <label className="text-[10px] font-medium text-muted-foreground">&nbsp;</label>
          <Button variant="ghost" size="sm" className="h-9 text-sm gap-1" onClick={onClear}>
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
