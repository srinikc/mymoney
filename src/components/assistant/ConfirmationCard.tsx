// ── ConfirmationCard ────────────────────────────────────────────────────
// Confirmation UI for pending write actions.

"use client"

import { CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import type { AssistantPendingAction } from "@/shared/assistant"

interface ConfirmationCardProps {
  action: AssistantPendingAction
  onConfirm: () => void
  onReject: () => void
  isLoading: boolean
}

export function ConfirmationCard({
  action,
  onConfirm,
  onReject,
  isLoading,
}: ConfirmationCardProps) {
  const riskStyles = {
    none: "border-gray-200 bg-gray-50",
    low: "border-blue-200 bg-blue-50",
    medium: "border-amber-200 bg-amber-50",
    high: "border-red-200 bg-red-50",
  }

  const riskIcons = {
    none: null,
    low: null,
    medium: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    high: <AlertTriangle className="w-4 h-4 text-red-600" />,
  }

  return (
    <div className={`mx-4 mb-3 border rounded-xl p-4 ${riskStyles[action.riskLevel]}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {riskIcons[action.riskLevel]}
        <span className="text-sm font-medium text-gray-900">
          Confirm Action
        </span>
      </div>

      {/* Action details */}
      <div className="text-sm text-gray-700 mb-3">
        <p className="font-medium">{action.toolName.replaceAll("_", " ")}</p>
        <pre className="mt-1 text-xs text-gray-500 bg-white/50 rounded p-2 overflow-x-auto">
          {JSON.stringify(action.args, null, 2)}
        </pre>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Confirm
        </button>
        <button
          onClick={onReject}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          <XCircle className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  )
}
