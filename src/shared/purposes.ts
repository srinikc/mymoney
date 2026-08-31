// Shared purpose options used across Investments, Fixed Deposits and Assets.
// Users can pick one of these or enter their own custom value.
export const PURPOSE_OPTIONS = [
  "Marriage - kid1",
  "Marriage - kid2",
  "Education - kid1",
  "Education - kid2",
  "House",
  "FarmLand-House",
  "Travel - Local",
  "Travel - Abroad",
  "Spiritual",
  "Giving",
  "Pooja",
  "Donation",
  "Jewellery - Gold",
  "Jewellery - Silver",
  "Renovation",
] as const

export const CUSTOM_PURPOSE_VALUE = "__custom__"

// ── Goal Types ──────────────────────────────────────────────────────────
// Goal-specific type options with default units and relevant fields.

export interface GoalTypeOption {
  value: string
  label: string
  defaultUnit: string
  showGoldQuantity: boolean
  showDeadline: boolean
  showArea: boolean
  showLocation: boolean
  showMonthlyContribution: boolean
}

export const GOAL_TYPES: GoalTypeOption[] = [
  {
    value: "Functions",
    label: "Functions",
    defaultUnit: "₹",
    showGoldQuantity: false,
    showDeadline: true,
    showArea: false,
    showLocation: false,
    showMonthlyContribution: true,
  },
  {
    value: "Marriages",
    label: "Marriages",
    defaultUnit: "₹",
    showGoldQuantity: true,
    showDeadline: true,
    showArea: false,
    showLocation: false,
    showMonthlyContribution: true,
  },
  {
    value: "FarmLand",
    label: "FarmLand",
    defaultUnit: "₹",
    showGoldQuantity: false,
    showDeadline: true,
    showArea: true,
    showLocation: true,
    showMonthlyContribution: true,
  },
  {
    value: "Health",
    label: "Health",
    defaultUnit: "₹",
    showGoldQuantity: false,
    showDeadline: true,
    showArea: false,
    showLocation: false,
    showMonthlyContribution: true,
  },
  {
    value: "Pooja",
    label: "Pooja",
    defaultUnit: "₹",
    showGoldQuantity: false,
    showDeadline: true,
    showArea: false,
    showLocation: false,
    showMonthlyContribution: false,
  },
  {
    value: "HouseRenovation",
    label: "House Renovation",
    defaultUnit: "₹",
    showGoldQuantity: false,
    showDeadline: true,
    showArea: true,
    showLocation: false,
    showMonthlyContribution: true,
  },
  {
    value: "House-Repairs",
    label: "House Repairs",
    defaultUnit: "₹",
    showGoldQuantity: false,
    showDeadline: true,
    showArea: false,
    showLocation: false,
    showMonthlyContribution: false,
  },
  {
    value: "Jewellery",
    label: "Jewellery",
    defaultUnit: "gm",
    showGoldQuantity: true,
    showDeadline: true,
    showArea: false,
    showLocation: false,
    showMonthlyContribution: false,
  },
  {
    value: "Education",
    label: "Education",
    defaultUnit: "₹",
    showGoldQuantity: false,
    showDeadline: true,
    showArea: false,
    showLocation: false,
    showMonthlyContribution: true,
  },
  {
    value: "Custom",
    label: "Custom",
    defaultUnit: "₹",
    showGoldQuantity: false,
    showDeadline: true,
    showArea: false,
    showLocation: false,
    showMonthlyContribution: true,
  },
]

export const GOAL_UNITS = ["₹", "gm", "kg", "sqft", "acres", "units"] as const

export function getGoalTypeConfig(type: string): GoalTypeOption {
  return GOAL_TYPES.find((t) => t.value === type) || GOAL_TYPES[GOAL_TYPES.length - 1] // Default to Custom
}