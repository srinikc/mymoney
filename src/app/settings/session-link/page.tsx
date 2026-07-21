"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Copy, Smartphone, Check } from "lucide-react"
import Link from "next/link"

export default function SessionLinkPage() {
  const [token, setToken] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Try to get session token from cookies
    const cookies = document.cookie.split("; ")
    const sessionCookie = cookies.find((c) =>
      c.startsWith("authjs.session-token=") || c.startsWith("next-auth.session-token=")
    )
    if (sessionCookie) {
      setToken(sessionCookie.split("=")[1])
    }
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Smartphone className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Mobile Session Link</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Share Session with Mobile App</CardTitle>
          <CardDescription>
            Copy the session token below and paste it into the MyMoney mobile app to log in without entering credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {token ? (
            <>
              <div className="rounded-lg border bg-muted p-4 break-all font-mono text-sm">
                {token}
              </div>
              <Button onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copied!" : "Copy Token"}
              </Button>
              <div className="text-sm text-muted-foreground mt-4 space-y-2">
                <p><strong>On your mobile app:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open the MyMoney mobile app</li>
                  <li>On the login screen, tap <strong>Link with Web</strong></li>
                  <li>Paste the token and tap <strong>Link</strong></li>
                </ol>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Unable to find session token. Make sure you are logged in.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
