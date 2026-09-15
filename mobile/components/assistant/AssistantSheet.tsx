// ── AssistantSheet (Mobile) ─────────────────────────────────────────────
// Bottom sheet for the unified assistant (mobile version).

import { useState, useEffect, useRef, useCallback } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useAssistant } from "../../hooks/useAssistant"
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition"
import { speakText, stopTts } from "../../lib/tts"
import { Colors } from "../../constants/Colors"
import { useColorScheme } from "react-native"

interface Props {
  visible: boolean
  onClose: () => void
  wakeWordActive?: boolean
  onToggleWakeWord?: () => void
  /** Bumped when the wake word fires. */
  listenSignal?: number
}

const SUGGESTIONS = [
  "How much did I spend?",
  "What's my net worth?",
  "Am I over budget?",
  "Add an expense",
  "Set a budget",
]

export function AssistantSheet({ visible, onClose, wakeWordActive, onToggleWakeWord, listenSignal }: Props) {
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light
  const router = useRouter()
  const {
    messages,
    isLoading,
    error,
    pendingAction,
    sendMessage,
    confirmAction,
    rejectAction,
    appendAssistantMessage,
  } = useAssistant()
  const [input, setInput] = useState("")
  const scrollViewRef = useRef<ScrollView>(null)
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    start,
    stop,
    reset,
  } = useSpeechRecognition()

  const [speakReplies, setSpeakReplies] = useState(true)
  const [conversationMode, setConversationMode] = useState(true)
  const [paused, setPaused] = useState(false)
  const [autoListenKey, setAutoListenKey] = useState(0)
  const pausedRef = useRef(false)
  const lastHandledIdRef = useRef<number | null>(null)
  const wakeWelcomeIdRef = useRef<number | null>(null)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  // Sending a message resumes a stopped conversation.
  const send = useCallback(
    (text: string, modality: "text" | "voice" = "text") => {
      setPaused(false)
      return sendMessage(text, modality)
    },
    [sendMessage],
  )

  // Wake word fired: greet with date/time, speak it, then listen.
  useEffect(() => {
    if (!listenSignal) return
    const now = new Date()
    const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    const welcome = `👋 Welcome! It's ${dateStr}, ${timeStr}. What would you like to do?`
    wakeWelcomeIdRef.current = appendAssistantMessage(welcome)
    const after = () => {
      if (conversationMode && !pausedRef.current) setAutoListenKey((k) => k + 1)
    }
    if (speakReplies) speakText(welcome, "en-IN", after)
    else after()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listenSignal])

  // Auto-listen whenever the signal changes.
  useEffect(() => {
    if (!autoListenKey || !isSupported || !visible) return
    reset()
    start("en-IN", false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoListenKey])

  // Send the recognised query.
  useEffect(() => {
    if (transcript) {
      void send(transcript, "voice")
      reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript])

  // New assistant reply: navigate, speak it, then listen again.
  useEffect(() => {
    const last = messages.at(-1)
    if (!last || last.role !== "assistant") return
    if (lastHandledIdRef.current === last.id) return
    if (wakeWelcomeIdRef.current === last.id) return
    lastHandledIdRef.current = last.id
    const nav = last.metadata?.navigation as { path: string; label: string } | undefined
    if (nav) {
      router.push(nav.path as never)
      onClose()
      return
    }
    const after = () => {
      if (conversationMode && !pausedRef.current) setAutoListenKey((k) => k + 1)
    }
    if (speakReplies) speakText(last.content, "en-IN", after)
    else after()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  // Stop speech/listening when the sheet closes.
  useEffect(() => {
    if (!visible) {
      stop()
      stopTts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const handleStop = useCallback(() => {
    stopTts()
    stop()
    setPaused(true)
  }, [stop])

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages])

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      void send(input.trim(), "text")
      setInput("")
    }
  }

  const handleSuggestion = (suggestion: string) => {
    void send(suggestion, "text")
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "85%",
            }}
          >
            {/* Handle */}
            <View style={{ alignItems: "center", paddingTop: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.border,
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.primary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#FFF", fontWeight: "bold" }}>M</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
                    MyMoney Assistant
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    {messages.length > 0 ? `${messages.length} messages` : "Ready to help"}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {onToggleWakeWord && (
                  <TouchableOpacity
                    onPress={onToggleWakeWord}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: wakeWordActive ? "#22C55E" : theme.background,
                    }}
                  >
                    <Ionicons
                      name={wakeWordActive ? "mic" : "mic-off"}
                      size={16}
                      color={wakeWordActive ? "#FFFFFF" : theme.textSecondary}
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1, padding: 16 }}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {messages.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: theme.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Ionicons name="chatbubble" size={32} color="#FFF" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: theme.text, marginBottom: 8 }}>
                    MyMoney Assistant
                  </Text>
                  <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: "center", paddingHorizontal: 32 }}>
                    Ask me anything about your finances, or use voice to add expenses.
                  </Text>
                </View>
              ) : (
                messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={{
                      flexDirection: "row",
                      justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    {msg.role !== "user" && (
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: theme.primary,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 8,
                        }}
                      >
                        <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "bold" }}>M</Text>
                      </View>
                    )}
                    <View
                      style={{
                        maxWidth: "75%",
                        backgroundColor: msg.role === "user" ? theme.primary : theme.background,
                        borderRadius: 16,
                        borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                        borderBottomLeftRadius: msg.role === "user" ? 16 : 4,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: msg.role === "user" ? "#FFF" : theme.text,
                        }}
                      >
                        {msg.content}
                      </Text>
                      {msg.source && (
                        <Text
                          style={{
                            fontSize: 10,
                            color: msg.role === "user" ? "rgba(255,255,255,0.7)" : theme.textTertiary,
                            marginTop: 4,
                          }}
                        >
                          {msg.source === "deterministic" ? "✦ Deterministic" : "✦ AI"}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              )}

              {/* Loading */}
              {isLoading && (
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: theme.primary,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                  >
                    <ActivityIndicator size="small" color="#FFF" />
                  </View>
                  <View
                    style={{
                      backgroundColor: theme.background,
                      borderRadius: 16,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: theme.textSecondary }}>Thinking...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Pending action */}
            {pendingAction && (
              <View
                style={{
                  marginHorizontal: 16,
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.warning,
                  backgroundColor: theme.warningLight,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8 }}>
                  Confirm Action
                </Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>
                  {pendingAction.toolName.replaceAll("_", " ")}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={confirmAction}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: "#10B981",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#FFF", fontWeight: "600" }}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={rejectAction}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: theme.background,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: theme.text }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Error */}
            {error && (
              <View
                style={{
                  marginHorizontal: 16,
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.expenseLight,
                }}
              >
                <Text style={{ fontSize: 13, color: theme.expense }}>{error}</Text>
              </View>
            )}

            {/* Suggestions (when no messages) */}
            {messages.length === 0 && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                <Text style={{ fontSize: 12, color: theme.textTertiary, marginBottom: 8 }}>
                  Try asking
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {SUGGESTIONS.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => handleSuggestion(s)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor: theme.background,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: theme.textSecondary }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Assistant behaviour toggles */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                paddingHorizontal: 16,
                paddingBottom: 6,
                gap: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => { setSpeakReplies((v) => { if (v) stopTts(); return !v }) }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: speakReplies ? theme.primary + "22" : theme.background,
                }}
              >
                <Ionicons name={speakReplies ? "volume-high" : "volume-mute"} size={14} color={theme.textSecondary} />
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>{speakReplies ? "Voice on" : "Voice off"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setConversationMode((v) => !v)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: conversationMode ? theme.primary + "22" : theme.background,
                }}
              >
                <Ionicons name="repeat" size={14} color={theme.textSecondary} />
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>{conversationMode ? "Hands-free" : "Manual"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleStop}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: theme.background,
                }}
              >
                <Ionicons name="square" size={14} color={theme.expense} />
                <Text style={{ fontSize: 11, color: theme.expense }}>Stop</Text>
              </TouchableOpacity>
              {isListening && <Text style={{ fontSize: 11, color: "#22C55E" }}>Listening…</Text>}
              {speechError && <Text style={{ fontSize: 11, color: theme.expense }}>{speechError}</Text>}
            </View>

            {/* Input */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: theme.border,
                gap: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => { if (isListening) stop(); else start("en-IN", false) }}
                disabled={!isSupported}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isListening ? "#EF4444" : theme.background,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name={isListening ? "mic-off" : "mic"} size={18} color={isListening ? "#FFF" : theme.textSecondary} />
              </TouchableOpacity>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask about your finances..."
                placeholderTextColor={theme.textTertiary}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                  paddingHorizontal: 16,
                  fontSize: 14,
                  color: theme.text,
                }}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!input.trim() || isLoading}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: input.trim() ? theme.primary : theme.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="send"
                  size={18}
                  color={input.trim() ? "#FFF" : theme.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
