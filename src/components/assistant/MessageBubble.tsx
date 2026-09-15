// ── MessageBubble ───────────────────────────────────────────────────────
// Individual message bubble for the assistant conversation.

"use client"

import { Bot, User } from "lucide-react"
import type { AssistantMessage } from "@/shared/assistant"

interface MessageBubbleProps {
  message: AssistantMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Bot avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Message content */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-indigo-600 text-white rounded-br-md"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Source indicator */}
        {message.source && (
          <p className={`text-xs mt-1 ${isUser ? "text-indigo-200" : "text-gray-500"}`}>
            {message.source === "deterministic" ? "✦ Deterministic" : "✦ AI"}
          </p>
        )}

        {/* Metadata (intent, confidence) */}
        {message.metadata?.intent && message.metadata.intent !== "unknown" && (
          <div className={`flex gap-2 mt-2 text-xs ${isUser ? "text-indigo-200" : "text-gray-500"}`}>
            <span className="px-2 py-0.5 rounded-full bg-black/10">
              {message.metadata.intent.replaceAll("_", " ")}
            </span>
            {message.metadata.confidence && (
              <span className="px-2 py-0.5 rounded-full bg-black/10">
                {message.metadata.confidence}
              </span>
            )}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </div>
  )
}
