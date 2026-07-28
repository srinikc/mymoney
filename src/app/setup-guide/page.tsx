"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronRight, Server, Key, UserPlus, Link2, Shield, Database, Download, Lock } from "lucide-react"

const SECTIONS = [
    {
      title: "Prerequisites & Environment Setup",
      icon: Key,
      content: [
        { heading: "Required: Generate AUTH_SECRET (One-Time, Manual)", text: "The `AUTH_SECRET` environment variable is MANDATORY. Without it, JWT token verification fails and no one can log in. Generate it using: `openssl rand -base64 32` on Linux/Mac or run this Node.js one-liner: `node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"`. Add the output to your `.env` file as `AUTH_SECRET=<generated-value>`. This is a one-time step — changing it later invalidates all existing sessions." },
        { heading: "Required: Database URL", text: "Set `DATABASE_URL` in `.env` to your PostgreSQL connection string. Format: `postgresql://user:password@host:5432/dbname?schema=public`." },
        { heading: "Optional: AUTH_GOOGLE_ID & AUTH_GOOGLE_SECRET", text: "Required for Google OAuth sign-in. Obtain from Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID. Add redirect URI: `http://localhost:3005/api/auth/callback/google`." },
        { heading: "Optional: TEST_DATABASE_URL", text: "Set to a separate PostgreSQL database for testing. Admin can switch between production and test DB from Settings → Database. Format: `postgresql://user:password@host:5432/dbname_test?schema=public`." },
        { heading: "Optional: RAZORPAY Keys", text: "For payment processing. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. Configure webhook URL in Razorpay dashboard." },
        { heading: "Optional: Integrations", text: "Set `AUTH_RESEND_KEY` for email, `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` for AI features, `ZERODHA_API_KEY`/`SHAREKHAN_API_KEY` for broker integrations." },
      ],
    },
    {
      title: "Installation",
      icon: Server,
    content: [
      { heading: "Docker Setup (Recommended)", text: "Clone the repo and run `docker compose up -d`. This starts PostgreSQL, the Next.js app, and all services. Access the app at http://localhost:3005." },
      { heading: "Manual Setup", text: "Requirements: Node.js 20+, PostgreSQL 16+. Run `npm install`, then configure your .env file (see below), then `npx prisma db push && npm run dev`." },
      { heading: "Database Setup", text: "The app uses PostgreSQL. Set DATABASE_URL in .env to point to your database. Run `npx prisma db push` to create all tables, then `npx prisma db seed` to populate initial data (categories, features)." },
    ],
  },
  {
    title: "Configuration",
    icon: Key,
    content: [
      { heading: "Environment Variables", text: "Copy `.env.template` to `.env`. Required: `DATABASE_URL`, `AUTH_SECRET`. Optional: `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` for Google login, `AUTH_RESEND_KEY` for email, `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` for payments." },
      { heading: "Authentication", text: "The app uses NextAuth with credentials (email/password) and optional Google OAuth. The first visit to `/login` redirects to `/setup` to create the admin account." },
      { heading: "Secrets", text: "Generate a strong AUTH_SECRET with `openssl rand -base64 32`. Never commit .env to version control." },
    ],
  },
  {
    title: "First Admin Setup",
    icon: UserPlus,
    content: [
      { heading: "Create Admin Account", text: "Visit `/setup` on first run. Enter your email and a password (min 8 chars). This creates the admin user with premium tier access." },
      { heading: "Verify Setup", text: "After creation, you're redirected to `/login`. Sign in with your email and password. You'll be taken to the onboarding wizard." },
      { heading: "Onboarding Wizard", text: "Complete the onboarding to set your name, currency, and default categories. This creates your first financial profile." },
    ],
  },
  {
    title: "Integrations",
    icon: Link2,
    content: [
      { heading: "Google Login", text: "Set up OAuth credentials at Google Cloud Console. Add `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` to .env. Configure redirect URI to `http://localhost:3005/api/auth/callback/google`." },
      { heading: "Gmail Import", text: "Enable Gmail API in Google Cloud Console. Create OAuth credentials (Web application). Add the client ID and secret to .env. The Gmail import feature scans your inbox for financial transaction emails." },
      { heading: "GPay Auto-Import", text: "Configure Google Drive API access. The GPay import uses Playwright automation to request Google Takeout exports and parse them automatically." },
      { heading: "Razorpay Payments", text: "Create a Razorpay account. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` to .env. Configure the webhook URL in Razorpay dashboard to `https://your-domain.com/api/webhooks/razorpay`." },
      { heading: "Broker Integrations", text: "Connect Zerodha, Sharekhan, Groww, or MF Central via the Integrations settings page. Each requires API credentials from the respective broker." },
    ],
  },
  {
    title: "User Management",
    icon: Shield,
    content: [
      { heading: "Creating Users", text: "Go to Admin → Users. Click 'Create User'. Fill in name, email, and set a password or toggle Google-linked. Assign a role (user/admin/manager/viewer) and tier (free/pro/premium)." },
      { heading: "Managing Subscriptions", text: "Each user has a tier: Free, Pro, or Premium. Change tiers from the Admin → Users page. Feature access is controlled by the tier and can be overridden per user from Admin → Feature Flags." },
      { heading: "Feature Flags", text: "Go to Admin → Feature Flags. Toggle features on/off globally or per user. Each feature has a minimum tier requirement (free/pro/premium)." },
    ],
  },
  {
    title: "Maintenance",
    icon: Database,
    content: [
      { heading: "Backups", text: "Back up your PostgreSQL database regularly using `pg_dump`. Store backups securely. The app data includes all user financial data." },
      { heading: "Updates", text: "Pull the latest code and run `npm install`. Run `npx prisma db push` to apply any schema changes. Check the CHANGELOG for breaking changes." },
      { heading: "Monitoring", text: "Check the dev server logs at `dev-server.log`. Monitor disk space for uploaded files (tax documents, receipts). Audit logs are accessible at Admin → Audit Log." },
    ],
  },
  {
    title: "Security & Multi-Tenancy",
    icon: Lock,
    content: [
      { heading: "Row-Level Multi-Tenancy", text: "Every user's data is isolated at the database row level via `profileId`. All records (expenses, budgets, investments, etc.) are filtered by the user's profile. Users cannot access other users' data even through API calls because every query includes the authenticated user's profileId. This is enforced server-side in every API route." },
      { heading: "Database Encryption", text: "Data is encrypted in transit via TLS/SSL (configure your reverse proxy). At rest, encryption depends on your PostgreSQL configuration — enable `pgcrypto` or use disk-level encryption (LUKS, EBS encryption). The app does not currently encrypt sensitive fields (like API keys) at the application level — this is a planned improvement." },
      { heading: "Audit Trail for Admin Actions", text: "All create, update, delete, and import actions by any user are logged in the `AuditLog` table with timestamp, action type, entity, entity ID, and metadata. Admin can view the audit log at /admin/audit-log. Note: View/read actions and login/logout events are not currently logged." },
      { heading: "AUTH_SECRET — Critical Manual Step", text: "The AUTH_SECRET environment variable MUST be set before starting the app in production. It is used by NextAuth to sign and verify JWT session tokens. Without it, all login attempts fail with a 500 error. Generate a strong random value (see Prerequisites section) and NEVER commit it to version control or share it. If you change AUTH_SECRET after users have logged in, all existing sessions become invalid and users must re-login." },
      { heading: "Password Security", text: "All passwords are hashed with bcrypt (salt rounds 12) before storage. The app enforces a minimum 8-character password length. For stronger security, enforce complexity requirements (uppercase, lowercase, digits, special characters) at your reverse proxy or identity provider level." },
      { heading: "Security Headers", text: "The app includes Content-Security-Policy (CSP), HSTS, X-Frame-Options, X-Content-Type-Options, and Permissions-Policy headers in its response. These are configured in next.config.ts. CSP allows scripts from 'self', Razorpay, and Google — verify this matches your deployment." },
    ],
  },
  {
    title: "Production Deployment Checklist",
    icon: Shield,
    content: [
      { heading: "1. Set AUTH_SECRET", text: "Generate and set AUTH_SECRET in .env. This is MANDATORY — without it, login fails. See Prerequisites section above." },
      { heading: "2. Configure TLS/SSL", text: "Use a reverse proxy (Caddy, Nginx, Traefik) with automatic TLS certificates (Let's Encrypt). The app does not terminate TLS itself. Example Caddyfile is included in the project root." },
      { heading: "3. Set Production DATABASE_URL", text: "Point to your production PostgreSQL database. Use a strong password. Restrict network access to the database — only allow connections from the app server." },
      { heading: "4. Run Database Migrations", text: "Run `npx prisma db push` to create all tables and indexes. For production with zero downtime, use `npx prisma migrate deploy` instead." },
      { heading: "5. Seed Initial Data", text: "Run `npx tsx scripts/seed-features.ts` to populate feature flags. The first visit to /setup creates the admin account." },
      { heading: "6. Configure Firewall", text: "Only expose ports 80 (HTTP) and 443 (HTTPS) to the internet. Keep the database port (5432) and any other services internal." },
      { heading: "7. Set Up Monitoring", text: "Check dev-server.log for application errors. Configure PostgreSQL monitoring (pg_stat_statements, pgBadger). Set up log rotation to prevent disk full issues." },
      { heading: "8. Regular Backups", text: "Schedule daily PostgreSQL backups using pg_dump. Store backups in a separate, secure location. Test restore procedure regularly." },
    ],
  },
  {
    title: "Troubleshooting",
    icon: Download,
    content: [
      { heading: "Login Issues", text: "If you can't log in, check that the admin user exists in the database. Reset password via `scripts/reset-admin-password.ts`. Ensure AUTH_SECRET is set correctly." },
      { heading: "Gmail/GPay Issues", text: "Re-authenticate Google services from the dialog. Ensure OAuth credentials have the correct redirect URIs. Check that the Playwright profile in `.gpay-profile` is valid." },
      { heading: "Database Errors", text: "Run `npx prisma db push` to sync schema. If migration fails, check PostgreSQL is running and DATABASE_URL is correct. Use `npx prisma db push --force-reset` to rebuild (destroys data)." },
    ],
  },
]

export default function SetupGuidePage() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Setup &amp; Installation Guide</h1>
        <p className="text-muted-foreground mt-1">For administrators — deploy, configure, and manage MyMoney</p>
      </div>

      {SECTIONS.map((section) => {
        const Icon = section.icon
        const isOpen = expanded === section.title
        return (
          <Card key={section.title}>
            <button
              onClick={() => setExpanded(isOpen ? null : section.title)}
              className="w-full text-left"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </button>
            {isOpen && (
              <CardContent className="space-y-4 pt-0">
                {section.content.map((item, i) => (
                  <div key={i}>
                    <h4 className="text-sm font-semibold mb-1">{item.heading}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
