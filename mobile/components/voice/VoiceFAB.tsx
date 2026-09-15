import { useState } from "react"
import {
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Colors } from "../../constants/Colors"
import VoiceModal from "./VoiceModal"

export function VoiceFAB() {
  const colorScheme = useColorScheme()
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light
  const [open, setOpen] = useState(false)

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.income }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="mic" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <VoiceModal visible={open} onClose={() => setOpen(false)} />
    </>
  )
}

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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
})
