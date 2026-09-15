// ── AssistantFAB (Mobile) ───────────────────────────────────────────────
// Floating action button for the assistant (mobile version).
// Includes wake word toggle and auto-opens on detection.

import { useState, useEffect, useCallback, memo, useRef } from "react"
import { TouchableOpacity, StyleSheet, View, Text } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { AssistantSheet } from "./AssistantSheet"
import { Colors } from "../../constants/Colors"
import { useColorScheme } from "react-native"
import { useWakeWord } from "../../hooks/useWakeWord"
import { playPromptSound } from "../../lib/prompt-sound"

function AssistantFABInner() {
  const [open, setOpen] = useState(false)
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light
  const { isActive: wakeWordActive, isTriggered, error: wakeWordError, loadProgress, toggle: toggleWakeWord, resetTrigger } = useWakeWord()

  const handleClose = useCallback(() => setOpen(false), [])
  const handleOpen = useCallback(() => setOpen(true), [])

  // Auto-open sheet when wake word is detected + play prompt sound
  useEffect(() => {
    if (isTriggered) {
      void playPromptSound("wake")
      setOpen(true)
      resetTrigger()
    }
  }, [isTriggered, resetTrigger])

  // Play enable/disable prompt sound when wake word state changes
  const prevActiveRef = useRef(wakeWordActive)
  useEffect(() => {
    if (wakeWordActive !== prevActiveRef.current) {
      void playPromptSound(wakeWordActive ? "enable" : "disable")
      prevActiveRef.current = wakeWordActive
    }
  }, [wakeWordActive])

  return (
    <>
      {/* Main FAB */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={handleOpen}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
        <Ionicons name="mic" size={12} color="rgba(255,255,255,0.8)" style={{ position: "absolute", bottom: 6, right: 6 }} />
      </TouchableOpacity>

      {/* Wake word toggle — small button above main FAB */}
      <TouchableOpacity
        onPress={toggleWakeWord}
        style={[
          styles.wakeWordButton,
          { backgroundColor: wakeWordActive ? "#22C55E" : theme.surface },
        ]}
        activeOpacity={0.8}
      >
        <Ionicons
          name={wakeWordActive ? "mic" : "mic-off"}
          size={16}
          color={wakeWordActive ? "#FFFFFF" : theme.textSecondary}
        />
      </TouchableOpacity>

      {/* Wake word status indicator */}
      {wakeWordActive && (
        <View style={styles.statusContainer}>
          {loadProgress !== null && loadProgress < 1 ? (
            <>
              <View style={[styles.statusDot, { backgroundColor: "#EAB308" }]} />
              <Text style={[styles.statusText, { color: "#EAB308" }]}>
                Loading model... {Math.round(loadProgress * 100)}%
              </Text>
            </>
          ) : (
            <>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Listening...</Text>
            </>
          )}
        </View>
      )}

      {/* Wake word error */}
      {wakeWordError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{wakeWordError}</Text>
        </View>
      )}

      <AssistantSheet
        visible={open}
        onClose={handleClose}
        wakeWordActive={wakeWordActive}
        onToggleWakeWord={toggleWakeWord}
      />
    </>
  )
}

export const AssistantFAB = memo(AssistantFABInner)

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: 80,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  wakeWordButton: {
    position: "absolute",
    bottom: 136,
    right: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  statusContainer: {
    position: "absolute",
    bottom: 140,
    right: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    zIndex: 99,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  statusText: {
    fontSize: 10,
    color: "#22C55E",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  errorContainer: {
    position: "absolute",
    bottom: 140,
    right: 60,
    maxWidth: 180,
    zIndex: 99,
  },
  errorText: {
    fontSize: 10,
    color: "#EF4444",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
})
