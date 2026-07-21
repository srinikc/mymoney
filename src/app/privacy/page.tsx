export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: July 2026</p>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Information We Collect</h2>
        <p className="text-sm leading-relaxed">MyMoney collects the following data to provide personal finance management:</p>
        <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
          <li><strong>Account data:</strong> Email address, name, and hashed password (if using email sign-in).</li>
          <li><strong>Financial data:</strong> Income sources, expenses, budgets, goals, investments, insurance policies, loans, assets, liabilities, subscriptions, and tax documents you enter.</li>
          <li><strong>Transaction data:</strong> Bank CSV/PDF files you upload for import, GPay transaction history from Google Takeout exports, and Gmail financial email metadata.</li>
          <li><strong>Device data:</strong> Platform type (Android/iOS) for push notifications, biometric authentication status (no biometric data stored).</li>
        </ul>

        <h2 className="text-xl font-semibold">2. How We Use Your Data</h2>
        <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
          <li>Display your financial dashboard, reports, and insights.</li>
          <li>Calculate financial health scores, tax estimates, and projections.</li>
          <li>Send push notifications for reminders and alerts (opt-in).</li>
          <li>Match expenses to income sources via auto-linking (user-confirmed only).</li>
          <li>AI chatbot uses your financial context to answer questions (no data is used for training).</li>
        </ul>

        <h2 className="text-xl font-semibold">3. Data Storage & Security</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          All data is stored in your own PostgreSQL database. We use industry-standard encryption (SSL/TLS) for data in transit.
          API keys (OpenAI, Claude, broker integrations) are stored encrypted. We do not sell, share, or transmit your financial
          data to any third party except as required by law or as explicitly authorized by you (e.g., broker OAuth connections).
        </p>

        <h2 className="text-xl font-semibold">4. Google API & User Data</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          MyMoney uses Google APIs (Drive read-only, Gmail read-only) solely for importing your financial data. We do not
          share Google user data with any third party. Access can be revoked at any time via Google Account permissions.
          Our use of this data complies with Google API Services User Data Policy.
        </p>

        <h2 className="text-xl font-semibold">5. Third-Party Services</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          MyMoney optionally integrates with third-party services you explicitly authorize:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
          <li><strong>OpenAI / Anthropic:</strong> AI chatbot queries (your API key, no data shared otherwise).</li>
          <li><strong>Zerodha / Sharekhan:</strong> Broker portfolio sync (via OAuth, read-only).</li>
          <li><strong>Resend:</strong> Welcome emails (email address only).</li>
        </ul>

        <h2 className="text-xl font-semibold">6. Your Rights</h2>
        <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
          <li>Export your data at any time from the Reports page.</li>
          <li>Delete your account and all associated data.</li>
          <li>Revoke Google/Gmail/Drive access via your Google Account settings.</li>
        </ul>

        <h2 className="text-xl font-semibold">7. Contact</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          For privacy concerns, open an issue at github.com/srinikc/mymoney or contact the repository owner.
        </p>
      </section>
    </div>
  )
}
