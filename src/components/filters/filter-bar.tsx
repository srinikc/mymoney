"use client"

import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface FilterBarProps {
  categories: Array<{ id: number; name: string; color?: string }>
  categoryValue: string[]
  onCategoryChange: (value: string[]) => void

  distinctVendors: string[]
  vendorValue: string[]
  onVendorChange: (value: string[]) => void
  vendorMode: "contains" | "not-contains"
  onVendorModeToggle: () => void

  distinctPersons: string[]
  personValue: string[]
  onPersonChange: (value: string[]) => void

  distinctPaymentModes: string[]
  paymentModeValue: string[]
  onPaymentModeChange: (value: string[]) => void

  distinctBankAccounts: string[]
  bankValue: string[]
  onBankChange: (value: string[]) => void

  distinctSubCategories: string[]
  subCategoryValue: string[]
  onSubCategoryChange: (value: string[]) => void
  subCategoryMode: "contains" | "not-contains"
  onSubCategoryModeToggle: () => void

  amountMin: string
  amountMax: string
  onAmountMinChange: (value: string) => void
  onAmountMaxChange: (value: string) => void

  distinctRecurrenceTypes: string[]
  recurrenceValue: string[]
  onRecurrenceChange: (value: string[]) => void

  onClear: () => void
}

export function FilterBar({
  categories,
  categoryValue,
  onCategoryChange,
  distinctVendors,
  vendorValue,
  onVendorChange,
  vendorMode,
  onVendorModeToggle,
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
  subCategoryMode,
  onSubCategoryModeToggle,
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
    categoryValue.length > 0 ||
    vendorValue.length > 0 ||
    personValue.length > 0 ||
    paymentModeValue.length > 0 ||
    bankValue.length > 0 ||
    subCategoryValue.length > 0 ||
    amountMin !== "" ||
    amountMax !== "" ||
    recurrenceValue.length > 0

  // Map arrays to MultiSelectOption[]
  const categoryOptions: MultiSelectOption[] = categories.map((c) => ({
    label: c.name,
    value: String(c.id),
  }))

  const vendorOptions: MultiSelectOption[] = distinctVendors.map((v) => ({
    label: v,
    value: v,
  }))

  const personOptions: MultiSelectOption[] = distinctPersons.map((p) => ({
    label: p,
    value: p,
  }))

  const paymentModeOptions: MultiSelectOption[] = distinctPaymentModes.map((m) => ({
    label: m,
    value: m,
  }))

  const bankOptions: MultiSelectOption[] = distinctBankAccounts.map((b) => ({
    label: b,
    value: b,
  }))

  const subCategoryOptions: MultiSelectOption[] = distinctSubCategories.map((s) => ({
    label: s,
    value: s,
  }))

  const recurrenceTypeOptions: MultiSelectOption[] = distinctRecurrenceTypes.map((r) => ({
    label: r,
    value: r,
  }))

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2 items-end" data-testid="filter-bar">
      {/* Category filter */}
      <div className="space-y-0.5 min-w-0">
        <label className="text-[10px] font-medium text-muted-foreground">Category</label>
        <MultiSelect
          label="Category"
          options={categoryOptions}
          selected={categoryValue}
          onChange={onCategoryChange}
          placeholder="All Categories"
          className="w-36"
          showBlankOption
        />
      </div>

      {/* Vendor filter (with mode toggle) */}
      <div className="space-y-0.5 min-w-0">
        <label className="text-[10px] font-medium text-muted-foreground">Vendor</label>
        <MultiSelect
          label="Vendor"
          options={vendorOptions}
          selected={vendorValue}
          onChange={onVendorChange}
          placeholder="All Vendors"
          className="w-36"
          showBlankOption
          showModeToggle
          mode={vendorMode}
          onModeToggle={onVendorModeToggle}
        />
      </div>

      {/* Person filter */}
      <div className="space-y-0.5 min-w-0">
        <label className="text-[10px] font-medium text-muted-foreground">Person</label>
        <MultiSelect
          label="Person"
          options={personOptions}
          selected={personValue}
          onChange={onPersonChange}
          placeholder="All Persons"
          className="w-32"
          showBlankOption
        />
      </div>

      {/* Mode filter */}
      <div className="space-y-0.5 min-w-0">
        <label className="text-[10px] font-medium text-muted-foreground">Mode</label>
        <MultiSelect
          label="Mode"
          options={paymentModeOptions}
          selected={paymentModeValue}
          onChange={onPaymentModeChange}
          placeholder="All Modes"
          className="w-32"
          showBlankOption
        />
      </div>

      {/* Bank filter */}
      <div className="space-y-0.5 min-w-0">
        <label className="text-[10px] font-medium text-muted-foreground">Bank</label>
        <MultiSelect
          label="Bank"
          options={bankOptions}
          selected={bankValue}
          onChange={onBankChange}
          placeholder="All Banks"
          className="w-36"
          showBlankOption
        />
      </div>

      {/* Amount range */}
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

      {/* Type (recurrence) filter */}
      <div className="space-y-0.5 min-w-0">
        <label className="text-[10px] font-medium text-muted-foreground">Type</label>
        <MultiSelect
          label="Type"
          options={recurrenceTypeOptions}
          selected={recurrenceValue}
          onChange={onRecurrenceChange}
          placeholder="All Types"
          className="w-32"
          showBlankOption
        />
      </div>

      {/* Sub Cat filter (with mode toggle) */}
      <div className="space-y-0.5 min-w-0">
        <label className="text-[10px] font-medium text-muted-foreground">Sub Cat</label>
        <MultiSelect
          label="Sub-Cat"
          options={subCategoryOptions}
          selected={subCategoryValue}
          onChange={onSubCategoryChange}
          placeholder="All Sub Cats"
          className="w-36"
          showBlankOption
          showModeToggle
          mode={subCategoryMode}
          onModeToggle={onSubCategoryModeToggle}
        />
      </div>

      {/* Clear all button */}
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
