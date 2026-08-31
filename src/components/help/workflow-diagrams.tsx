"use client"

import { ArrowRight } from "lucide-react"

// Reusable inline-SVG workflow diagram component.
// Each diagram is a horizontal flow of nodes connected by arrows.

export interface DiagramNode {
  label: string
  detail?: string
  color?: string // background
  textColor?: string // foreground
}

export interface WorkflowDiagram {
  title: string
  nodes: DiagramNode[]
  // Optional vertical/horizontal orientation
  direction?: "horizontal" | "vertical"
}

const DEFAULT_COLOR = "#eef2ff"
const DEFAULT_TEXT = "#3730a3"
const ACCENT = "#6366f1"

export function DiagramRenderer({ diagram }: { diagram: WorkflowDiagram }) {
  const horizontal = diagram.direction !== "vertical"
  const nodes = diagram.nodes
  const n = nodes.length

  if (horizontal) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 overflow-x-auto">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Workflow: {diagram.title}
        </p>
        <svg viewBox={`0 0 ${n * 140} 110`} className="w-full min-w-[${n * 140}px] h-auto">
          {nodes.map((node, i) => {
            const x = i * 140
            const fill = node.color || DEFAULT_COLOR
            const stroke = node.textColor || DEFAULT_TEXT
            return (
              <g key={i}>
                <rect
                  x={x + 8}
                  y={15}
                  width={120}
                  height={node.detail ? 70 : 40}
                  rx={8}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.5}
                />
                <text
                  x={x + 68}
                  y={node.detail ? 36 : 38}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill={stroke}
                >
                  {truncate(node.label, 18)}
                </text>
                {node.detail && (
                  <text
                    x={x + 68}
                    y={52}
                    textAnchor="middle"
                    fontSize="9"
                    fill={stroke}
                    opacity={0.75}
                  >
                    {truncate(node.detail, 22)}
                  </text>
                )}
                {node.detail && (
                  <text
                    x={x + 68}
                    y={68}
                    textAnchor="middle"
                    fontSize="9"
                    fill={stroke}
                    opacity={0.75}
                  >
                    {truncate(node.detail.slice(22), 22)}
                  </text>
                )}
                {i < n - 1 && (
                  <g>
                    <line
                      x1={x + 130}
                      y1={50}
                      x2={x + 138}
                      y2={50}
                      stroke={ACCENT}
                      strokeWidth={1.5}
                    />
                    <polygon
                      points={`${x + 138},46 ${x + 138},54 ${x + 146},50`}
                      fill={ACCENT}
                    />
                  </g>
                )}
              </g>
            )
          })}
        </svg>
        {nodes.length > 3 && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">→ scroll for full flow →</p>
        )}
      </div>
    )
  }

  // vertical
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Workflow: {diagram.title}
      </p>
      <div className="flex flex-col items-stretch gap-2">
        {nodes.map((node, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className="w-full rounded-lg border p-2"
              style={{
                backgroundColor: node.color || DEFAULT_COLOR,
                borderColor: node.textColor || DEFAULT_TEXT,
                color: node.textColor || DEFAULT_TEXT,
              }}
            >
              <p className="text-xs font-semibold">{node.label}</p>
              {node.detail && <p className="text-[10px] opacity-80">{node.detail}</p>}
            </div>
            {i < n - 1 && <ArrowRight className="h-3 w-3 my-1 rotate-90 text-muted-foreground" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…"
}

// Pre-built diagrams for major pages
export const DIAGRAMS: Record<string, WorkflowDiagram> = {
  "/budgets": {
    title: "Set and track your monthly budget",
    nodes: [
      { label: "Add expense", detail: "Auto-categorized", color: "#dbeafe", textColor: "#1e40af" },
      { label: "View budget", detail: "vs actual spent", color: "#fef3c7", textColor: "#92400e" },
      { label: "Allocation wizard", detail: "50/30/20 suggestion", color: "#dcfce7", textColor: "#166534" },
      { label: "Apply suggestions", detail: "Click to set budgets", color: "#f3e8ff", textColor: "#6b21a8" },
      { label: "Track monthly", detail: "Stay on target", color: "#fce7f3", textColor: "#9d174d" },
    ],
  },
  "/insights": {
    title: "Get personalized insights from your data",
    nodes: [
      { label: "Data flows in", detail: "Expenses, income, goals", color: "#dbeafe", textColor: "#1e40af" },
      { label: "Detectors run", detail: "7+ types: anomaly, velocity, tax, …", color: "#fef3c7", textColor: "#92400e" },
      { label: "Filter by severity", detail: "alert / warn / info", color: "#dcfce7", textColor: "#166534" },
      { label: "Act on insights", detail: "Dismiss, tag, or fix", color: "#f3e8ff", textColor: "#6b21a8" },
    ],
  },
  "/emergency-fund": {
    title: "Build your safety net",
    nodes: [
      { label: "Set job type + dependents", detail: "Auto-suggests months", color: "#dbeafe", textColor: "#1e40af" },
      { label: "Compute target", detail: "Essential spend × months", color: "#fef3c7", textColor: "#92400e" },
      { label: "Compare to existing", detail: "Cash + savings a/c", color: "#dcfce7", textColor: "#166534" },
      { label: "Run-up plan", detail: "Auto monthly SIP", color: "#f3e8ff", textColor: "#6b21a8" },
      { label: "Re-evaluate Jan", detail: "Top up for inflation", color: "#fce7f3", textColor: "#9d174d" },
    ],
  },
  "/reports": {
    title: "Generate a comprehensive financial report",
    nodes: [
      { label: "Click Download", detail: "On /reports page", color: "#dbeafe", textColor: "#1e40af" },
      { label: "Server reads data", detail: "9 sections, real-time", color: "#fef3c7", textColor: "#92400e" },
      { label: "Builds PDF", detail: "TOC + 9 sections", color: "#dcfce7", textColor: "#166534" },
      { label: "Browser downloads", detail: "Share with CA", color: "#f3e8ff", textColor: "#6b21a8" },
    ],
  },
  "/learn/mutual-funds": {
    title: "Research and plan mutual fund investments",
    nodes: [
      { label: "Search funds", detail: "Filter by category, AMC, risk", color: "#dbeafe", textColor: "#1e40af" },
      { label: "Compare 3Y/5Y CAGR", detail: "vs category average", color: "#fef3c7", textColor: "#92400e" },
      { label: "Run calculator", detail: "SIP, lumpsum, or goal", color: "#dcfce7", textColor: "#166534" },
      { label: "See real value", detail: "Inflation-adjusted", color: "#f3e8ff", textColor: "#6b21a8" },
      { label: "Invest via Kuvera", detail: "Direct, zero commission", color: "#fce7f3", textColor: "#9d174d" },
    ],
  },
  "/learn/commodities": {
    title: "Track gold, silver, and ETF prices",
    nodes: [
      { label: "View live prices", detail: "14 instruments tracked", color: "#dbeafe", textColor: "#1e40af" },
      { label: "See 30-day trend", detail: "Sparkline per asset", color: "#fef3c7", textColor: "#92400e" },
      { label: "Calculate value", detail: "Grams × current rate", color: "#dcfce7", textColor: "#166534" },
      { label: "Compare instruments", detail: "Gold ETF vs physical", color: "#f3e8ff", textColor: "#6b21a8" },
    ],
  },
  "/learn/retirement": {
    title: "Plan for retirement with the 4% rule",
    nodes: [
      { label: "Enter your age + expenses", detail: "30s/40s/50s varies", color: "#dbeafe", textColor: "#1e40af" },
      { label: "Set expected return", detail: "11% equity, 7% debt", color: "#fef3c7", textColor: "#92400e" },
      { label: "Get projection", detail: "Nominal + real value", color: "#dcfce7", textColor: "#166534" },
      { label: "See on-track status", detail: "Surplus or shortfall", color: "#f3e8ff", textColor: "#6b21a8" },
      { label: "Compare NPS funds", detail: "SBI, HDFC, LIC…", color: "#fce7f3", textColor: "#9d174d" },
    ],
  },
  "/expenses/unusual": {
    title: "Tag and resolve unusual expenses",
    nodes: [
      { label: "Add expense > ₹5K", detail: "Auto-flagged unusual", color: "#dbeafe", textColor: "#1e40af" },
      { label: "Visit /expenses/unusual", detail: "See flagged list", color: "#fef3c7", textColor: "#92400e" },
      { label: "Pick purpose", detail: "wedding, medical, festival…", color: "#dcfce7", textColor: "#166534" },
      { label: "Tag or dismiss", detail: "Bulk action supported", color: "#f3e8ff", textColor: "#6b21a8" },
    ],
  },
  "/learn": {
    title: "Find age-appropriate financial guidance",
    nodes: [
      { label: "Set DOB in /settings", detail: "Age bucket auto-detected", color: "#dbeafe", textColor: "#1e40af" },
      { label: "Browse /learn", detail: "17 tips, 11 categories", color: "#fef3c7", textColor: "#92400e" },
      { label: "Open a tip", detail: "Workflow with steps", color: "#dcfce7", textColor: "#166534" },
      { label: "Apply one idea", detail: "Then move to next", color: "#f3e8ff", textColor: "#6b21a8" },
    ],
  },
  "/settings/profile": {
    title: "Set up your profile for personalized advice",
    nodes: [
      { label: "Open /settings/profile", detail: "Web or mobile", color: "#dbeafe", textColor: "#1e40af" },
      { label: "Set DOB (MM/YYYY)", detail: "Drives age-based tips", color: "#fef3c7", textColor: "#92400e" },
      { label: "Set annual income", detail: "Drives budget split", color: "#dcfce7", textColor: "#166534" },
      { label: "Pick language", detail: "6 supported, English content v1", color: "#f3e8ff", textColor: "#6b21a8" },
      { label: "Save", detail: "All features activate", color: "#fce7f3", textColor: "#9d174d" },
    ],
  },
}
