import OpenAI from "openai"
import Anthropic from "@anthropic-ai/sdk"

export type LLMProvider = "openai" | "claude" | "local" | "opencode" | string

interface LLMConfig {
  provider: LLMProvider
  openaiApiKey?: string
  anthropicApiKey?: string
  opencodeApiKey?: string
  model?: string
  baseUrl?: string
  localEndpoint?: string
}

async function getConfig(userId?: number): Promise<LLMConfig> {
  const fallback = {
    provider: (process.env.LLM_PROVIDER as LLMProvider) || "openai",
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    opencodeApiKey: process.env.OPENCODE_API_KEY,
    model: process.env.LLM_MODEL,
    baseUrl: process.env.LLM_BASE_URL,
    localEndpoint: process.env.LOCAL_LLM_ENDPOINT,
  }

  if (!userId) return fallback

  try {
    const { getConfig: getDbConfig } = await import("./get-config")
    const [provider, openaiKey, anthropicKey, opencodeKey, model, baseUrl, localEndpoint] = await Promise.all([
      getDbConfig("LLM_PROVIDER", userId),
      getDbConfig("OPENAI_API_KEY", userId),
      getDbConfig("ANTHROPIC_API_KEY", userId),
      getDbConfig("OPENCODE_API_KEY", userId),
      getDbConfig("LLM_MODEL", userId),
      getDbConfig("LLM_BASE_URL", userId),
      getDbConfig("LOCAL_LLM_ENDPOINT", userId),
    ])
    return {
      provider: (provider || fallback.provider) as LLMProvider,
      openaiApiKey: openaiKey || fallback.openaiApiKey,
      anthropicApiKey: anthropicKey || fallback.anthropicApiKey,
      opencodeApiKey: opencodeKey || fallback.opencodeApiKey,
      model: model || fallback.model,
      baseUrl: baseUrl || fallback.baseUrl,
      localEndpoint: localEndpoint || fallback.localEndpoint,
    }
  } catch {
    return fallback
  }
}

export async function queryLLM(prompt: string, userId?: number): Promise<string> {
  const config = await getConfig(userId)

  if (config.provider === "claude" && config.anthropicApiKey) {
    return queryClaude(prompt, config)
  }

  if (config.provider === "local" && config.localEndpoint) {
    return queryOpenAI(prompt, config, config.localEndpoint)
  }

  // OpenCode Zen is an OpenAI-compatible gateway. Free models work with no key;
  // a real API key (OPENCODE_API_KEY) is used when set.
  if (config.provider === "opencode") {
    return queryOpenCode(prompt, config)
  }

  // Default to OpenAI
  if (config.openaiApiKey) {
    return queryOpenAI(prompt, config)
  }

  // Fallback: no LLM configured — return a mock response for development
  return generateFallbackResponse(prompt)
}

export async function queryLLMStream(
  prompt: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  userId?: number,
): Promise<string> {
  const config = await getConfig(userId)

  if (config.provider === "claude" && config.anthropicApiKey) {
    return queryClaudeStream(prompt, onChunk, config, signal)
  }

  if (config.provider === "local" && config.localEndpoint) {
    return queryOpenAIStream(prompt, onChunk, config, signal, config.localEndpoint)
  }

  if (config.provider === "opencode") {
    return queryOpenCodeStream(prompt, onChunk, config, signal)
  }

  if (config.openaiApiKey) {
    return queryOpenAIStream(prompt, onChunk, config, signal)
  }

  // Fallback: simulate streaming
  const response = generateFallbackResponse(prompt)
  const chars = [...response]
  for (const char of chars) {
    if (signal?.aborted) break
    onChunk(char)
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  return response
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/chat\/completions\/?$/, "").replace(/\/+$/, "")
}

async function queryOpenAI(prompt: string, config: LLMConfig, baseUrl?: string): Promise<string> {
  const openai = new OpenAI({
    apiKey: config.openaiApiKey || "local",
    baseURL: baseUrl ? normalizeEndpoint(baseUrl) : config.baseUrl || undefined,
  })
  const model = config.model || "gpt-4o-mini"

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are MyMoney AI, a helpful personal finance assistant for Indian users." },
      { role: "user", content: prompt },
    ],
    max_tokens: 1024,
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content ?? "I'm sorry, I couldn't generate a response."
}

async function queryOpenCode(prompt: string, config: LLMConfig): Promise<string> {
  const baseUrl = normalizeEndpoint(config.baseUrl || "https://opencode.ai/zen/v1")
  const model = config.model || "gpt-4o-mini"
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (config.opencodeApiKey) headers["Authorization"] = `Bearer ${config.opencodeApiKey}`

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are MyMoney AI, a helpful personal finance assistant for Indian users." },
        { role: "user", content: prompt },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenCode Zen API error ${response.status}: ${text.slice(0, 300)}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? "I'm sorry, I couldn't generate a response."
}

async function queryOpenCodeStream(
  prompt: string,
  onChunk: (chunk: string) => void,
  config: LLMConfig,
  signal?: AbortSignal,
): Promise<string> {
  const baseUrl = normalizeEndpoint(config.baseUrl || "https://opencode.ai/zen/v1")
  const model = config.model || "gpt-4o-mini"
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (config.opencodeApiKey) headers["Authorization"] = `Bearer ${config.opencodeApiKey}`

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are MyMoney AI, a helpful personal finance assistant for Indian users." },
        { role: "user", content: prompt },
      ],
      max_tokens: 1024,
      temperature: 0.7,
      stream: true,
    }),
  })

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "")
    throw new Error(`OpenCode Zen API error ${response.status}: ${text.slice(0, 300)}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullResponse = ""
  let buffer = ""
  let done = false

  while (!done) {
    const { done: readDone, value } = await reader.read()
    done = readDone
    if (readDone || signal?.aborted) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith("data:")) continue
      const payload = trimmed.slice(5).trim()
      if (payload === "[DONE]") continue
      try {
        const json = JSON.parse(payload)
        const content = json.choices?.[0]?.delta?.content ?? ""
        if (content) {
          fullResponse += content
          onChunk(content)
        }
      } catch {
        // ignore partial JSON lines
      }
    }
  }
  return fullResponse
}

async function queryClaude(prompt: string, config: LLMConfig): Promise<string> {
  const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
  const model = config.model || "claude-3-haiku-20240307"

  const response = await anthropic.messages.create({
    model,
    system: "You are MyMoney AI, a helpful personal finance assistant for Indian users.",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1024,
    temperature: 0.7,
  })

  const textBlock = response.content.find((block) => block.type === "text")
  return textBlock?.text ?? "I'm sorry, I couldn't generate a response."
}

async function queryOpenAIStream(
  prompt: string,
  onChunk: (chunk: string) => void,
  config: LLMConfig,
  signal?: AbortSignal,
  baseUrl?: string,
): Promise<string> {
  const openai = new OpenAI({
    apiKey: config.openaiApiKey || "local",
    baseURL: baseUrl ? normalizeEndpoint(baseUrl) : config.baseUrl || undefined,
  })
  const model = config.model || "gpt-4o-mini"

  const stream = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are MyMoney AI, a helpful personal finance assistant for Indian users." },
      { role: "user", content: prompt },
    ],
    max_tokens: 1024,
    temperature: 0.7,
    stream: true,
  })

  let fullResponse = ""
  for await (const chunk of stream) {
    if (signal?.aborted) break
    const content = chunk.choices[0]?.delta?.content ?? ""
    if (content) {
      fullResponse += content
      onChunk(content)
    }
  }
  return fullResponse
}

async function queryClaudeStream(
  prompt: string,
  onChunk: (chunk: string) => void,
  config: LLMConfig,
  signal?: AbortSignal,
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
  const model = config.model || "claude-3-haiku-20240307"

  const stream = await anthropic.messages.create({
    model,
    system: "You are MyMoney AI, a helpful personal finance assistant for Indian users.",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1024,
    temperature: 0.7,
    stream: true,
  })

  let fullResponse = ""
  for await (const event of stream) {
    if (signal?.aborted) break
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      const content = event.delta.text ?? ""
      fullResponse += content
      onChunk(content)
    }
  }
  return fullResponse
}

function generateFallbackResponse(prompt: string): string {
  // Extract key info from prompt for basic context-aware response
  const lowerPrompt = prompt.toLowerCase()

  if (lowerPrompt.includes("spend") || lowerPrompt.includes("expense") || lowerPrompt.includes("expenditure")) {
    if (lowerPrompt.includes("food") || lowerPrompt.includes("dining") || lowerPrompt.includes("eat")) {
      return "Based on your spending data, you can check your food expenses in the Expenses section. I'd recommend setting a monthly dining budget of ₹3,000-₹5,000 to keep this category under control."
    }
    if (lowerPrompt.includes("month")) {
      return "Your monthly expenses are summarized in the dashboard. You can view the breakdown by category there. To reduce spending, try tracking discretionary expenses like dining out and entertainment."
    }
    return "Your total expenses and category breakdown are available on the dashboard. You can filter by date range to see specific periods. Would you like me to look into a particular category?"
  }

  if (lowerPrompt.includes("budget")) {
    if (lowerPrompt.includes("over") || lowerPrompt.includes("exceed")) {
      return "Check your Budgets page to see which categories are overspent. I recommend reviewing your top spending categories monthly to stay within limits."
    }
    if (lowerPrompt.includes("left") || lowerPrompt.includes("remain")) {
      return "Your budget progress is displayed on the Budgets page. Each category shows how much you've spent vs. your limit. Consider rebalancing if one category is consistently under-utilized."
    }
    return "Budgets help you track spending limits by category. You can set monthly budgets on the Budgets page. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings."
  }

  if (lowerPrompt.includes("goal") || lowerPrompt.includes("savings") || lowerPrompt.includes("save")) {
    if (lowerPrompt.includes("emergency")) {
      return "An emergency fund should cover 3-6 months of expenses. You can set this as a goal in the Goals section. Start by saving small amounts consistently."
    }
    if (lowerPrompt.includes("rate") || lowerPrompt.includes("enough")) {
      return "A good savings rate is 20% of your income. Track your income and expenses to calculate your actual rate. If it's below 20%, look for areas to cut back on discretionary spending."
    }
    return "Your savings goals are tracked in the Goals section. Set specific targets with deadlines to stay motivated. Automating your savings on payday can help you reach goals faster."
  }

  if (lowerPrompt.includes("net worth") || lowerPrompt.includes("wealth")) {
    return "Your net worth is the difference between your assets and liabilities. Track both on the Assets and Liabilities pages. Growing your net worth over time is a key indicator of financial health."
  }

  if (lowerPrompt.includes("health") || lowerPrompt.includes("score")) {
    return "Your financial health score is available on the dashboard. It considers savings rate, debt levels, emergency fund, and investment diversification. Try improving each component for a better score."
  }

  if (lowerPrompt.includes("invest")) {
    return "Start investing with a diversified portfolio. Consider index funds (NIFTY 50, Sensex) for long-term growth. A monthly SIP of even ₹1,000 can grow significantly over time due to compounding."
  }

  if (lowerPrompt.includes("tax")) {
    return "Tax planning is crucial. Under Section 80C, you can claim deductions up to ₹1.5L via ELSS, PPF, or EPF. Section 80D covers health insurance premiums. Consider consulting a CA for personalized advice."
  }

  if (lowerPrompt.includes("debt") || lowerPrompt.includes("loan") || lowerPrompt.includes("emi")) {
    return "Prioritize paying off high-interest debt first (credit cards, personal loans). Your debt-to-income ratio should ideally be below 30%. Consider debt consolidation if you have multiple loans."
  }

  return "I'm MyMoney AI, your personal finance assistant. I can help you with:\n\n• Spending analysis and category breakdowns\n• Budget tracking and alerts\n• Savings goals and progress\n• Investment suggestions\n• Net worth tracking\n• Tax planning tips\n\nWhat would you like to know about your finances?"
}
