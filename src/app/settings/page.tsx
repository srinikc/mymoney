"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell, Shield, Plug, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your application</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
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

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Plug className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Plugins</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Manage import sources, bank parsers, and categorizers</p>
            <Badge variant="outline" className="mt-2 text-xs">Coming soon</Badge>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
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
      </div>
    </div>
  )
}
