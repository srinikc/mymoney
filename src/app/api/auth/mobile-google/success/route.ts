import { NextResponse } from "next/server"

export async function GET() {
  // This page is reached after successful Google OAuth via NextAuth.
  // NextAuth sets the session cookie. We read it and return to the app.
  try {
    const { auth } = await import("@/lib/auth")
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get the session token from the request
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("authjs.session-token")?.value

    if (sessionCookie) {
      // Return the HTML page with the token for the mobile app
      return new Response(
        `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MyMoney - Mobile Auth</title>
<style>
body{font-family:-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f3f4f6}
.card{background:#fff;border-radius:16px;padding:32px;max-width:400px;width:90%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.1)}
h1{font-size:24px;color:#1f2937;margin-bottom:8px}
p{color:#6b7280;font-size:14px;line-height:1.5;margin-bottom:20px}
.token-box{background:#f3f4f6;border-radius:8px;padding:12px;word-break:break-all;font-family:monospace;font-size:12px;margin-bottom:16px;border:1px solid #e5e7eb}
.btn{background:#4f46e5;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;width:100%}
.btn:hover{background:#4338ca}
.copied{background:#10b981}
.success{color:#10b981;font-size:14px;margin-top:8px}
</style></head><body>
<div class="card">
<h1>✅ Authenticated</h1>
<p>Your session token is ready. Copy it below and paste into the MyMoney mobile app.</p>
<div class="token-box" id="token">${sessionCookie}</div>
<button class="btn" id="copyBtn" onclick="copyToken()">Copy Token</button>
<p class="success" id="copiedMsg" style="display:none">✓ Token copied! Go back to the app.</p>
</div>
<script>
function copyToken(){navigator.clipboard.writeText(document.getElementById('token').textContent)
.then(()=>{document.getElementById('copyBtn').textContent='Copied!';document.getElementById('copyBtn').className+=' copied';
document.getElementById('copiedMsg').style.display='block'})}
document.addEventListener('DOMContentLoaded',()=>{navigator.clipboard.writeText(document.getElementById('token').textContent)
.then(()=>{document.getElementById('copiedMsg').style.display='block'})})
</script>
</body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }

    return NextResponse.redirect(new URL("/settings/session-link", process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"))
  } catch {
    return NextResponse.json({ error: "Auth failed" }, { status: 500 })
  }
}
