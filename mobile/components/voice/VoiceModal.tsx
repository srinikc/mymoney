import { useState, useEffect } from "react"
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Colors } from "../../constants/Colors"
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition"
import { SUPPORTED_LANGUAGES } from "../../shared/voice"
import { playPromptSound } from "../../lib/prompt-sound"
import api from "../../api/client"
import { useQueryClient } from "@tanstack/react-query"

interface Props {
  visible: boolean
  onClose: () => void
}

type VoiceState = "idle" | "listening" | "processing" | "result" | "error"

function formatCurrency(n: number): string {
  if (n >= 10000000) return `\u20B9${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `\u20B9${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `\u20B9${(n / 1000).toFixed(1)}K`
  return `\u20B9${n}`
}

function intentLabel(intent: string): string {
  switch (intent) {
    case "add_expense": return "Expense"
    case "add_income": return "Income"
    case "set_budget": return "Budget"
    case "query": return "Query"
    default: return "Unknown"
  }
}

export default function VoiceModal({ visible, onClose }: Props) {
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light
  const queryClient = useQueryClient()

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error: sttError,
    start,
    stop,
    reset,
  } = useSpeechRecognition()

  const [language, setLanguage] = useState("en-IN")
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [voiceResult, setVoiceResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (sttError) {
      setError(sttError)
      setVoiceState("error")
    }
  }, [sttError])

  useEffect(() => {
    if (voiceState === "processing" && transcript.trim()) {
      sendToAPI(transcript.trim())
    } else if (voiceState === "processing" && !transcript.trim()) {
      setVoiceState("idle")
      setError("No speech detected")
    }
  }, [voiceState, transcript])

  const sendToAPI = async (text: string) => {
    try {
      const res = await api.post("/api/voice", { text, language })
      setVoiceResult(res.data)
      setVoiceState("result")
    } catch {
      setError("Failed to process voice input")
      setVoiceState("error")
    }
  }

  const handleMicPress = () => {
    if (!isSupported) {
      setError("Speech recognition not supported on this device")
      setVoiceState("error")
      return
    }
    setError(null)
    setSaved(false)
    if (voiceState === "listening") {
      stop()
      void playPromptSound("disable")
      setVoiceState("processing")
    } else {
      reset()
      void playPromptSound("enable")
      start(language)
      setVoiceState("listening")
    }
  }

  const handleConfirm = async () => {
    if (!voiceResult?.entity) return
    const { intent, entity } = voiceResult
    try {
      if (intent === "add_expense") {
        await api.post("/api/expenses", {
          date: entity.date || new Date().toISOString().split("T")[0],
          amount: entity.amount,
          categoryName: entity.category || "Other",
          vendor: entity.vendor || "",
          description: entity.description || "",
          paymentMode: entity.paymentMode || "UPI",
        })
      } else if (intent === "add_income") {
        await api.post("/api/income/sources", {
          name: entity.vendor || entity.name || "Income",
          amount: entity.amount,
          type: entity.incomeType || "onetime",
          categoryName: entity.category,
        })
      } else if (intent === "set_budget") {
        const catRes = await api.get("/api/budgets")
        const categories = catRes.data.categories || catRes.data || []
        const match = categories.find(
          (c: any) => c.name?.toLowerCase() === entity.category?.toLowerCase(),
        )
        if (!match)
          throw new Error(
            `Category "${entity.category}" not found. Use the Budgets page.`,
          )
        await api.post("/api/budgets", {
          categoryId: match.id,
          month: entity.budgetMonth || new Date().getMonth() + 1,
          year: entity.budgetYear || new Date().getFullYear(),
          amount: entity.amount,
        })
      } else {
        return
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["income"] }),
        queryClient.invalidateQueries({ queryKey: ["budgets"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ])

      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setVoiceState("idle")
        setVoiceResult(null)
        reset()
      }, 2000)
    } catch (e: any) {
      setError(e.message || "Failed to save")
      setVoiceState("error")
    }
  }

  const handleRestart = () => {
    setVoiceState("idle")
    setVoiceResult(null)
    setSaved(false)
    setError(null)
    reset()
  }

  const handleClose = () => {
    stop()
    setVoiceState("idle")
    setVoiceResult(null)
    setSaved(false)
    setError(null)
    reset()
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="mic" size={20} color={theme.primary} />
              <Text style={[styles.title, { color: theme.text }]}>
                Voice Assistant
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Language picker */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.langRow}
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.code}
                onPress={() => setLanguage(l.code)}
                style={[
                  styles.langBtn,
                  {
                    backgroundColor:
                      language === l.code ? theme.primary : theme.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.langText,
                    {
                      color: language === l.code ? "#fff" : theme.text,
                    },
                  ]}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Body */}
          <View style={styles.body}>
            {/* Not supported */}
            {!isSupported && (
              <View style={styles.centered}>
                <Ionicons name="mic-off" size={40} color={theme.textTertiary} />
                <Text
                  style={[styles.centeredText, { color: theme.textSecondary }]}
                >
                  Speech recognition not supported
                </Text>
              </View>
            )}

            {/* Idle */}
            {isSupported && voiceState === "idle" && !voiceResult && (
              <View style={styles.centered}>
                <TouchableOpacity
                  onPress={handleMicPress}
                  style={[
                    styles.micBtn,
                    { backgroundColor: theme.primary + "20" },
                  ]}
                >
                  <Ionicons name="mic" size={40} color={theme.primary} />
                </TouchableOpacity>
                <Text
                  style={[styles.hint, { color: theme.textSecondary }]}
                >
                  Tap to speak
                </Text>
                <Text
                  style={[styles.subHint, { color: theme.textTertiary }]}
                >
                  Try: &ldquo;Spent 250 on groceries&rdquo;
                </Text>
              </View>
            )}

            {/* Listening */}
            {voiceState === "listening" && (
              <View style={styles.centered}>
                <TouchableOpacity
                  onPress={handleMicPress}
                  style={[styles.micBtn, styles.micBtnActive]}
                >
                  <View style={styles.micPulse} />
                  <Ionicons name="mic" size={40} color="#fff" />
                </TouchableOpacity>
                <Text
                  style={[styles.listeningText, { color: theme.expense }]}
                >
                  Listening...
                </Text>
                {(interimTranscript || transcript) ? (
                  <Text
                    style={[styles.transcript, { color: theme.text }]}
                  >
                    &ldquo;{transcript}
                    {interimTranscript}&rdquo;
                  </Text>
                ) : null}
              </View>
            )}

            {/* Processing */}
            {voiceState === "processing" && (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text
                  style={[
                    styles.processingText,
                    { color: theme.textSecondary },
                  ]}
                >
                  Processing...
                </Text>
              </View>
            )}

            {/* Result */}
            {voiceState === "result" && voiceResult && (
              <ScrollView>
                {/* Transcript */}
                <View
                  style={[styles.card, { backgroundColor: theme.background }]}
                >
                  <Text
                    style={[styles.cardLabel, { color: theme.textTertiary }]}
                  >
                    I HEARD
                  </Text>
                  <Text style={[styles.cardText, { color: theme.text }]}>
                    &ldquo;{transcript}&rdquo;
                  </Text>
                </View>

                {/* Intent + entities */}
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.background,
                      borderWidth: 1,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.intentRow}>
                    <View
                      style={[
                        styles.intentBadge,
                        { backgroundColor: theme.primary + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.intentText,
                          { color: theme.primary },
                        ]}
                      >
                        {intentLabel(voiceResult.intent)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.confidence,
                        { color: theme.textTertiary },
                      ]}
                    >
                      {voiceResult.confidence} confidence
                    </Text>
                  </View>

                  {voiceResult.entity?.amount != null && (
                    <View style={styles.entityRow}>
                      <Text
                        style={[
                          styles.entityLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Amount
                      </Text>
                      <Text
                        style={[
                          styles.entityValue,
                          { color: theme.text },
                        ]}
                      >
                        {formatCurrency(voiceResult.entity.amount)}
                      </Text>
                    </View>
                  )}
                  {voiceResult.entity?.category && (
                    <View style={styles.entityRow}>
                      <Text
                        style={[
                          styles.entityLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Category
                      </Text>
                      <Text
                        style={[
                          styles.entityValue,
                          { color: theme.text },
                        ]}
                      >
                        {voiceResult.entity.category}
                      </Text>
                    </View>
                  )}
                  {voiceResult.entity?.vendor && (
                    <View style={styles.entityRow}>
                      <Text
                        style={[
                          styles.entityLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Vendor
                      </Text>
                      <Text
                        style={[
                          styles.entityValue,
                          { color: theme.text },
                        ]}
                      >
                        {voiceResult.entity.vendor}
                      </Text>
                    </View>
                  )}
                  {voiceResult.entity?.date && (
                    <View style={styles.entityRow}>
                      <Text
                        style={[
                          styles.entityLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Date
                      </Text>
                      <Text
                        style={[
                          styles.entityValue,
                          { color: theme.text },
                        ]}
                      >
                        {voiceResult.entity.date}
                      </Text>
                    </View>
                  )}
                  {voiceResult.entity?.paymentMode && (
                    <View style={styles.entityRow}>
                      <Text
                        style={[
                          styles.entityLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Payment
                      </Text>
                      <Text
                        style={[
                          styles.entityValue,
                          { color: theme.text },
                        ]}
                      >
                        {voiceResult.entity.paymentMode}
                      </Text>
                    </View>
                  )}

                  {voiceResult.answer && (
                    <View
                      style={[
                        styles.answerBox,
                        { backgroundColor: theme.primaryLight },
                      ]}
                    >
                      <Ionicons
                        name="chatbubble-ellipses"
                        size={14}
                        color={theme.primary}
                      />
                      <Text
                        style={[
                          styles.answerText,
                          { color: theme.primary, flex: 1 },
                        ]}
                      >
                        {voiceResult.answer}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Saved */}
                {saved && (
                  <View
                    style={[
                      styles.card,
                      { backgroundColor: theme.incomeLight },
                    ]}
                  >
                    <View style={styles.savedRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={theme.income}
                      />
                      <Text
                        style={[
                          styles.savedText,
                          { color: theme.income },
                        ]}
                      >
                        Saved!
                      </Text>
                    </View>
                  </View>
                )}

                {/* Actions */}
                {!saved &&
                  voiceResult.entity &&
                  voiceResult.intent !== "query" && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        onPress={handleRestart}
                        style={[
                          styles.actionBtn,
                          {
                            backgroundColor: theme.background,
                            borderWidth: 1,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="refresh"
                          size={18}
                          color={theme.text}
                        />
                        <Text
                          style={[
                            styles.actionText,
                            { color: theme.text },
                          ]}
                        >
                          Re-record
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleConfirm}
                        style={[
                          styles.actionBtn,
                          { backgroundColor: theme.income },
                        ]}
                      >
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={[styles.actionText, { color: "#fff" }]}>
                          Confirm & Save
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                {!saved && voiceResult.intent === "query" && (
                  <TouchableOpacity
                    onPress={handleRestart}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: theme.background,
                        borderWidth: 1,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Ionicons name="mic" size={18} color={theme.text} />
                    <Text style={[styles.actionText, { color: theme.text }]}>
                      Ask another question
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            {/* Error */}
            {voiceState === "error" && error && (
              <View style={styles.centered}>
                <Ionicons name="mic-off" size={40} color={theme.expense} />
                <Text
                  style={[styles.errorText, { color: theme.expense }]}
                >
                  {error}
                </Text>
                <TouchableOpacity
                  onPress={handleRestart}
                  style={[
                    styles.retryBtn,
                    {
                      backgroundColor: theme.background,
                      borderWidth: 1,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons name="refresh" size={18} color={theme.text} />
                  <Text style={[styles.retryText, { color: theme.text }]}>
                    Try again
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer */}
          {isSupported &&
            voiceState !== "listening" &&
            voiceState !== "processing" && (
              <View
                style={[
                  styles.footer,
                  { borderTopColor: theme.border },
                ]}
              >
                <TouchableOpacity
                  onPress={handleMicPress}
                  style={[styles.footerBtn, { backgroundColor: theme.primary }]}
                >
                  <Ionicons name="mic" size={18} color="#fff" />
                  <Text style={styles.footerBtnText}>
                    {voiceResult ? "Speak again" : "Start listening"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 18, fontWeight: "700" },
  langRow: { marginBottom: 16 },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  langText: { fontSize: 13, fontWeight: "500" },
  body: { minHeight: 250, justifyContent: "center" },
  centered: { alignItems: "center", paddingVertical: 30 },
  centeredText: { fontSize: 14, marginTop: 12 },
  micBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnActive: { backgroundColor: "#EF4444" },
  micPulse: {
    ...StyleSheet.absoluteFill,
    borderRadius: 40,
    backgroundColor: "#EF4444",
    opacity: 0.3,
  },
  hint: { fontSize: 14, marginTop: 16 },
  subHint: { fontSize: 12, marginTop: 4 },
  listeningText: { fontSize: 14, fontWeight: "600", marginTop: 16 },
  transcript: {
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  processingText: { fontSize: 14, marginTop: 12 },
  card: { borderRadius: 12, padding: 14, marginBottom: 12 },
  cardLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardText: { fontSize: 14, fontStyle: "italic" },
  intentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  intentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  intentText: { fontSize: 12, fontWeight: "600" },
  confidence: { fontSize: 11 },
  entityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  entityLabel: { fontSize: 13 },
  entityValue: { fontSize: 13, fontWeight: "600" },
  answerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  answerText: { fontSize: 13, lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 14,
    borderRadius: 12,
  },
  actionText: { fontSize: 14, fontWeight: "600" },
  savedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  savedText: { fontSize: 14, fontWeight: "600" },
  errorText: { fontSize: 14, marginTop: 12, textAlign: "center" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  retryText: { fontSize: 14, fontWeight: "600" },
  footer: { borderTopWidth: 1, paddingTop: 16, marginTop: 8 },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 14,
  },
  footerBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
})
