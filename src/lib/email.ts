import { Resend } from "resend"

const FROM = "MyMoney <onboarding@mymoney.finance>"
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function sendWelcomeEmail(email: string, name: string) {
  if (!process.env.AUTH_RESEND_KEY) {
    console.warn("AUTH_RESEND_KEY not set — skipping welcome email")
    return { success: false, reason: "no api key" }
  }

  const resend = new Resend(process.env.AUTH_RESEND_KEY)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: "Welcome to MyMoney! 🎉",
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; width: 48px; height: 48px; background: #6366f1; border-radius: 12px; line-height: 48px; color: white; font-size: 20px; font-weight: bold;">M</div>
            </div>
            <h1 style="font-size: 24px; margin-bottom: 8px;">Welcome to MyMoney, ${name}!</h1>
            <p style="color: #666; font-size: 15px; line-height: 1.6;">You're all set to take control of your finances. Here's what you can do next:</p>
            <div style="margin: 24px 0;">
              <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px;">
                <strong style="color: #6366f1;">📊 Track Expenses</strong>
                <p style="margin: 4px 0 0; color: #666; font-size: 13px;">Add your expenses manually or import from bank statements</p>
              </div>
              <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px;">
                <strong style="color: #6366f1;">🎯 Set Goals</strong>
                <p style="margin: 4px 0 0; color: #666; font-size: 13px;">Create savings goals and track your progress</p>
              </div>
              <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 12px;">
                <strong style="color: #6366f1;">📈 Track Investments</strong>
                <p style="margin: 4px 0 0; color: #666; font-size: 13px;">Monitor your portfolio and see your returns</p>
              </div>
              <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <strong style="color: #6366f1;">🤖 AI Financial Advisor</strong>
                <p style="margin: 4px 0 0; color: #666; font-size: 13px;">Get personalized insights and recommendations</p>
              </div>
            </div>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 32px;">MyMoney — Personal Finance Manager</p>
          </div>
        `,
      })
      return { success: true }
    } catch (error) {
      console.error(`Failed to send welcome email (attempt ${attempt}/${MAX_RETRIES}):`, error)
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt)
      } else {
        console.error("All retry attempts exhausted for welcome email to", email)
        return { success: false, reason: String(error) }
      }
    }
  }

  return { success: false, reason: "unreachable" }
}