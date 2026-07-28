"use client"

import { Toaster as SonnerToaster } from "sonner"
import { useTheme } from "next-themes"

type ToastProviderProps = React.ComponentProps<typeof SonnerToaster>

export function ToastProvider({ ...props }: ToastProviderProps) {
  const { theme } = useTheme()

  return (
    <SonnerToaster
      theme={theme as "light" | "dark" | "system"}
      position="bottom-right"
      richColors
      closeButton
      {...props}
    />
  )
}
