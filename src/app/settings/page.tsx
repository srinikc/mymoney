"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, Shield, Plug, Mail, Key, Server, Smartphone, FileText, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your application</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/settings/api-keys">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">API Keys</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Configure LLM (OpenAI/Claude), Resend, Zerodha, and Sharekhan API keys</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/environment">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Environment</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View and override env config: DB URL, Auth secret, Google OAuth, App URL</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/gmail-parser">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Gmail Parsing</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Customize keywords for detecting UPI, purchases, gold, silver, bank, and other financial emails</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/integrations">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Plug className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Integrations</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Zerodha, Sharekhan, Groww, MF Central, Google Drive, and GPay import setup</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/session-link">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Mobile Session Link</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Share your session with the mobile app to log in without re-entering credentials</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/privacy">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Privacy Policy</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Required for Play Store listing. Describes data collection, storage, and third-party services.</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Rate limiting, audit logs, and access control</p>
            <Badge variant="outline" className="mt-2 text-xs">Coming soon</Badge>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Configure in-app, email, and WhatsApp alerts</p>
            <Badge variant="outline" className="mt-2 text-xs">Coming soon</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
