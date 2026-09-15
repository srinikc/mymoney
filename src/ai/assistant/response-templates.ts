// ── Response Templates ──────────────────────────────────────────────────
// Natural language response templates for each intent.
// Supports multi-language responses.

import type { AssistantIntent, ParsedEntities } from "@/shared/assistant"

// ── English Templates ───────────────────────────────────────────────────

const EN_TEMPLATES: Record<AssistantIntent, (entities: ParsedEntities) => string> = {
  greeting: () => {
    const greetings = [
      "Hello! I'm your MyMoney assistant. I can help you track expenses, check budgets, monitor goals, and more. What would you like to do?",
      "Hi there! How can I help you with your finances today?",
      "Hey! Ready to help you manage your money. What's on your mind?",
    ]
    return greetings[Math.floor(Math.random() * greetings.length)]
  },
  small_talk: () => {
    const responses = [
      "I'm doing great, thanks for asking! I'm here to help you manage your finances. Want to check your spending, budgets, or goals?",
      "I'm your MyMoney assistant — I help you track expenses, manage budgets, and reach your financial goals. What would you like to know?",
      "Thanks! I'm here to make managing your money easier. You can ask me about your spending, budgets, goals, or net worth.",
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  },
  help: () => {
    return "Here's what I can help you with:\n\n• Track expenses — \"Add ₹500 lunch expense\"\n• Check spending — \"How much did I spend this month?\"\n• Manage budgets — \"Am I over budget?\"\n• View goals — \"What's my savings goal progress?\"\n• Net worth — \"What's my net worth?\"\n• Transactions — \"Show my last transaction\"\n\nJust type or use voice — I understand English, Hindi, and Kannada!"
  },
  add_expense: (e) => {
    const parts = ["Added"]
    if (e.amount) parts.push(`₹${e.amount}`)
    parts.push("expense")
    if (e.category) parts.push(`for ${e.category}`)
    if (e.vendor) parts.push(`at ${e.vendor}`)
    if (e.date) parts.push(`on ${e.date}`)
    return parts.join(" ") + "."
  },
  add_income: (e) => {
    const parts = ["Added"]
    if (e.amount) parts.push(`₹${e.amount}`)
    parts.push("income")
    if (e.name) parts.push(`from ${e.name}`)
    return parts.join(" ") + "."
  },
  set_budget: (e) => {
    const parts = ["Set"]
    if (e.amount) parts.push(`₹${e.amount}`)
    parts.push("budget")
    if (e.category) parts.push(`for ${e.category}`)
    return parts.join(" ") + "."
  },
  update_budget: (e) => {
    const parts = ["Updated"]
    parts.push("budget")
    if (e.category) parts.push(`for ${e.category}`)
    if (e.amount) parts.push(`to ₹${e.amount}`)
    return parts.join(" ") + "."
  },
  add_goal: (e) => {
    const parts = ["Created goal"]
    if (e.name) parts.push(`"${e.name}"`)
    if (e.amount) parts.push(`with target ₹${e.amount}`)
    return parts.join(" ") + "."
  },
  update_goal: (e) => {
    const parts = ["Updated goal"]
    if (e.name) parts.push(`"${e.name}"`)
    return parts.join(" ") + "."
  },
  add_investment: (e) => {
    const parts = ["Added investment"]
    if (e.name) parts.push(`"${e.name}"`)
    if (e.amount) parts.push(`worth ₹${e.amount}`)
    return parts.join(" ") + "."
  },
  add_subscription: (e) => {
    const parts = ["Added subscription"]
    if (e.name) parts.push(`"${e.name}"`)
    if (e.amount) parts.push(`at ₹${e.amount}/month`)
    return parts.join(" ") + "."
  },
  add_insurance: (e) => {
    const parts = ["Added insurance"]
    if (e.name) parts.push(`"${e.name}"`)
    return parts.join(" ") + "."
  },
  query_spending: () => {
    return "Let me check your spending..."
  },
  query_budget: () => {
    return "Let me check your budgets..."
  },
  query_goals: () => {
    return "Let me check your goals..."
  },
  query_net_worth: () => {
    return "Let me calculate your net worth..."
  },
  query_health: () => {
    return "Let me check your financial health..."
  },
  query_investments: () => {
    return "Let me check your investments..."
  },
  query_income: () => {
    return "Let me check your income..."
  },
  query_subscriptions: () => {
    return "Let me check your subscriptions..."
  },
  query_transactions: () => {
    return "Let me find your recent transactions..."
  },
  query_domain: () => "Let me look that up for you...",
  navigate: (e) => (e.name ? `Opening ${e.name}…` : "Opening that page…"),
  unknown: (e) => {
    if (e.amount) {
      return `I understand you mentioned ₹${e.amount}, but I'm not sure what you'd like me to do. Could you clarify?`
    }
    return "I'm not sure what you'd like me to do. Could you rephrase that?"
  },
}

// ── Hindi Templates ─────────────────────────────────────────────────────

const HI_TEMPLATES: Record<AssistantIntent, (entities: ParsedEntities) => string> = {
  greeting: () => {
    const greetings = [
      "नमस्ते! मैं आपका MyMoney सहायक हूँ। मैं खर्च ट्रैक करने, बजट चेक करने, लक्ष्य देखने में मदद कर सकता हूँ। आप क्या करना चाहेंगे?",
      "हैलो! आज मैं आपकी वित्तीय मदद कैसे कर सकता हूँ?",
      "नमस्कार! आपके पैसे के प्रबंधन में आपकी मदद के लिए तैयार हूँ। आपके मन में क्या है?",
    ]
    return greetings[Math.floor(Math.random() * greetings.length)]
  },
  small_talk: () => {
    const responses = [
      "मैं बहुत अच्छा हूँ, पूछने के लिए धन्यवाद! मैं आपकी वित्तीय मदद के लिए यहाँ हूँ। आप अपना खर्च, बजट या लक्ष्य देखना चाहेंगे?",
      "मैं आपका MyMoney सहायक हूँ — मैं खर्च ट्रैक करने, बजट प्रबंधित करने और वित्तीय लक्ष्यों तक पहुँचने में मदद करता हूँ। आप क्या जानना चाहेंगे?",
      "धन्यवाद! मैं आपके पैसे का प्रबंधन आसान बनाने के लिए यहाँ हूँ।",
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  },
  help: () => {
    return "मैं इनमें मदद कर सकता हूँ:\n\n• खर्च ट्रैक करें — \"₹500 लंच खर्च जोड़ो\"\n• खर्च चेक करें — \"इस महीने कितना खर्च किया?\"\n• बजट प्रबंधित करें — \"क्या मैं बजट से ज़्यादा हूँ?\"\n• लक्ष्य देखें — \"मेरा बचत लक्ष्य कैसा चल रहा है?\"\n• नेट वर्थ — \"मेरी नेट वर्थ कितनी है?\"\n\nबस टाइप करें या वॉइस का उपयोग करें — मैं हिंदी समझता हूँ!"
  },
  add_expense: (e) => {
    const parts = ["जोड़ा गया"]
    if (e.amount) parts.push(`₹${e.amount}`)
    parts.push("खर्च")
    if (e.category) parts.push(`${e.category} के लिए`)
    if (e.vendor) parts.push(`${e.vendor} पर`)
    return parts.join(" ") + "।"
  },
  add_income: (e) => {
    const parts = ["जोड़ा गया"]
    if (e.amount) parts.push(`₹${e.amount}`)
    parts.push("आमदनी")
    if (e.name) parts.push(`${e.name} से`)
    return parts.join(" ") + "।"
  },
  set_budget: (e) => {
    const parts = ["सेट किया गया"]
    if (e.amount) parts.push(`₹${e.amount}`)
    parts.push("बजट")
    if (e.category) parts.push(`${e.category} के लिए`)
    return parts.join(" ") + "।"
  },
  update_budget: () => {
    return "बजट अपडेट किया गया।"
  },
  add_goal: () => {
    return "लक्ष्य बनाया गया।"
  },
  update_goal: () => {
    return "लक्ष्य अपडेट किया गया।"
  },
  add_investment: () => {
    return "निवेश जोड़ा गया।"
  },
  add_subscription: () => {
    return "सब्सक्रिप्शन जोड़ा गया।"
  },
  add_insurance: () => {
    return "बीमा जोड़ा गया।"
  },
  query_spending: () => "आपका खर्च देख रहा हूँ...",
  query_budget: () => "आपका बजट देख रहा हूँ...",
  query_goals: () => "आपके लक्ष्य देख रहा हूँ...",
  query_net_worth: () => "आपकी नेट वर्थ गिन रहा हूँ...",
  query_health: () => "आपकी वित्तीय स्वास्थ्य देख रहा हूँ...",
  query_investments: () => "आपके निवेश देख रहा हूँ...",
  query_income: () => "आपकी आमदनी देख रहा हूँ...",
  query_subscriptions: () => "आपकी सब्सक्रिप्शन देख रहा हूँ...",
  query_transactions: () => "आपके हाल के लेनदेन देख रहा हूँ...",
  query_domain: () => "मैं वह देख रहा हूँ...",
  navigate: (e) => (e.name ? `${e.name} खोल रहा हूँ...` : "वह पेज खोल रहा हूँ..."),
  unknown: (e) => {
    if (e.amount) {
      return `आपने ₹${e.amount} का उल्लेख किया, लेकिन मुझे समझ नहीं आया आप क्या करना चाहते हैं। क्या आप स्पष्ट कर सकते हैं?`
    }
    return "मुझे समझ नहीं आया आप क्या करना चाहते हैं। क्या आप दोबारा कह सकते हैं?"
  },
}

// ── Kannada Templates ───────────────────────────────────────────────────

const KN_TEMPLATES: Record<AssistantIntent, (entities: ParsedEntities) => string> = {
  greeting: () => {
    const greetings = [
      "ನಮಸ್ತೆ! ನಾನು ನಿಮ್ಮ MyMoney ಸಹಾಯಕ. ಖರ್ಚು ಟ್ರ್ಯಾಕ್ ಮಾಡಲು, ಬಜೆಟ್ ಪರಿಶೀಲಿಸಲು, ಗುರಿಗಳನ್ನು ನೋಡಲು ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
      "ಹೇಗಿದ್ದೀರಿ? ಇಂದು ನಿಮ್ಮ ಹಣಕಾಸಿನ ಬಗ್ಗೆ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ?",
      "ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಹಣವನ್ನು ನಿರ್ವಹಿಸಲು ಸಿದ್ಧ. ನಿಮ್ಮ ಮನದಲ್ಲಿ ಏನಿದೆ?",
    ]
    return greetings[Math.floor(Math.random() * greetings.length)]
  },
  small_talk: () => {
    const responses = [
      "ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ, ಕೇಳಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದ! ನಿಮ್ಮ ಹಣಕಾಸಿನ ಸಹಾಯಕ್ಕಾಗಿ ನಾನು ಇಲ್ಲಿದ್ದೇನೆ. ನಿಮ್ಮ ಖರ್ಚು, ಬಜೆಟ್ ಅಥವಾ ಗುರಿಗಳನ್ನು ನೋಡಲು ಬಯಸುವಿರಾ?",
      "ನಾನು ನಿಮ್ಮ MyMoney ಸಹಾಯಕ — ಖರ್ಚು ಟ್ರ್ಯಾಕ್ ಮಾಡಲು, ಬಜೆಟ್ ನಿರ್ವಹಿಸಲು ಮತ್ತು ಹಣಕಾಸಿನ ಗುರಿಗಳನ್ನು ಸಾಧಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ನೀವು ಏನು ತಿಳಿಯಲು ಬಯಸುತ್ತೀರಿ?",
      "ಧನ್ಯವಾದ! ನಿಮ್ಮ ಹಣವನ್ನು ಸುಲಭವಾಗಿ ನಿರ್ವಹಿಸಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ.",
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  },
  help: () => {
    return "ನಾನು ಇವುಗಳಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:\n\n• ಖರ್ಚು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ — \"₹500 ಊಟದ ಖರ್ಚು ಸೇರಿಸಿ\"\n• ಖರ್ಚು ಪರಿಶೀಲಿಸಿ — \"ಈ ತಿಂಗಳು ಎಷ್ಟು ಖರ್ಚು ಮಾಡಿದೆ?\"\n• ಬಜೆಟ್ ನಿರ್ವಹಿಸಿ — \"ನಾನು ಬಜೆಟ್‌ನಿಂದ ಹೆಚ್ಚಿನದಾಗಿದ್ದೇನೆಯೇ?\"\n• ಗುರಿಗಳನ್ನು ನೋಡಿ — \"ನನ್ನ ಉಳಿತಾಯ ಗುರಿ ಹೇಗಿದೆ?\"\n• ನೆಟ್ ವರ್ತ್ — \"ನನ್ನ ನೆಟ್ ವರ್ತ್ ಎಷ್ಟು?\"\n\nಬಸ್ ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಧ್ವನಿ ಬಳಸಿ — ನಾನು ಕನ್ನಡ ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತೇನೆ!"
  },
  add_expense: (e) => {
    const parts = ["ಸೇರಿಸಲಾಗಿದೆ"]
    if (e.amount) parts.push(`₹${e.amount}`)
    parts.push("ಖರ್ಚು")
    if (e.category) parts.push(`${e.category} ಗೆ`)
    return parts.join(" ") + "."
  },
  add_income: (e) => {
    const parts = ["ಸೇರಿಸಲಾಗಿದೆ"]
    if (e.amount) parts.push(`₹${e.amount}`)
    parts.push("ಆದಾಯ")
    if (e.name) parts.push(`${e.name} ಇಂದ`)
    return parts.join(" ") + "."
  },
  set_budget: (e) => {
    const parts = ["ಹೊಂದಿಸಲಾಗಿದೆ"]
    if (e.amount) parts.push(`₹${e.amount}`)
    parts.push("ಬಜೆಟ್")
    if (e.category) parts.push(`${e.category} ಗೆ`)
    return parts.join(" ") + "."
  },
  update_budget: () => "ಬಜೆಟ್ ನವೀಕರಿಸಲಾಗಿದೆ.",
  add_goal: () => "ಗುರಿ ರಚಿಸಲಾಗಿದೆ.",
  update_goal: () => "ಗುರಿ ನವೀಕರಿಸಲಾಗಿದೆ.",
  add_investment: () => "ಹೂಡಿಕೆ ಸೇರಿಸಲಾಗಿದೆ.",
  add_subscription: () => "ಸಬ್ಸ್ಕ್ರಿಪ್ಷನ್ ಸೇರಿಸಲಾಗಿದೆ.",
  add_insurance: () => "ವಿಮೆ ಸೇರಿಸಲಾಗಿದೆ.",
  query_spending: () => "ನಿಮ್ಮ ಖರ್ಚು ಪರಿಶೀಲಿಸುತ್ತಿದ್ದೇನೆ...",
  query_budget: () => "ನಿಮ್ಮ ಬಜೆಟ್ ಪರಿಶೀಲಿಸುತ್ತಿದ್ದೇನೆ...",
  query_goals: () => "ನಿಮ್ಮ ಗುರಿಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತಿದ್ದೇನೆ...",
  query_net_worth: () => "ನಿಮ್ಮ ನೆಟ್ ವರ್ತ್ ಲೆಕ್ಕ ಹಾಕುತ್ತಿದ್ದೇನೆ...",
  query_health: () => "ನಿಮ್ಮ ಆರ್ಥಿಕ ಆರೋಗ್ಯ ಪರಿಶೀಲಿಸುತ್ತಿದ್ದೇನೆ...",
  query_investments: () => "ನಿಮ್ಮ ಹೂಡಿಕೆಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತಿದ್ದೇನೆ...",
  query_income: () => "ನಿಮ್ಮ ಆದಾಯ ಪರಿಶೀಲಿಸುತ್ತಿದ್ದೇನೆ...",
  query_subscriptions: () => "ನಿಮ್ಮ ಸಬ್ಸ್ಕ್ರಿಪ್ಷನ್‌ಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತಿದ್ದೇನೆ...",
  query_transactions: () => "ನಿಮ್ಮ ಇತ್ತೀಚಿನ ವ್ಯವಹಾರಗಳನ್ನು ಹುಡುಕುತ್ತಿದ್ದೇನೆ...",
  query_domain: () => "ಅದನ್ನು ನೋಡುತ್ತಿದ್ದೇನೆ...",
  navigate: (e) => (e.name ? `${e.name} ತೆರೆಯುತ್ತಿದ್ದೇನೆ...` : "ಆ ಪುಟವನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ..."),
  unknown: (e) => {
    if (e.amount) {
      return `ನೀವು ₹${e.amount} ಉಲ್ಲೇಖಿಸಿದ್ದೀರಿ, ಆದರೆ ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ ಎಂದು ನನಗೆ ತಿಳಿದಿಲ್ಲ. ನೀವು ಸ್ಪಷ್ಟಪಡಿಸಬಹುದೇ?`
    }
    return "ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ ಎಂದು ನನಗೆ ತಿಳಿದಿಲ್ಲ. ನೀವು ಮರುಹೇಳಬಹುದೇ?"
  },
}

// ── Template Map ────────────────────────────────────────────────────────

const LANGUAGE_TEMPLATES: Record<string, Record<AssistantIntent, (entities: ParsedEntities) => string>> = {
  "en-IN": EN_TEMPLATES,
  "en": EN_TEMPLATES,
  "hi-IN": HI_TEMPLATES,
  "hi": HI_TEMPLATES,
  "kn-IN": KN_TEMPLATES,
  "kn": KN_TEMPLATES,
  // For other languages, use English as fallback
  "ta-IN": EN_TEMPLATES,
  "ta": EN_TEMPLATES,
  "te-IN": EN_TEMPLATES,
  "te": EN_TEMPLATES,
  "bn-IN": EN_TEMPLATES,
  "bn": EN_TEMPLATES,
  "mr-IN": HI_TEMPLATES,
  "mr": HI_TEMPLATES,
  "ur-IN": EN_TEMPLATES,
  "ur": EN_TEMPLATES,
  "ml-IN": EN_TEMPLATES,
  "ml": EN_TEMPLATES,
  "gu-IN": EN_TEMPLATES,
  "gu": EN_TEMPLATES,
  "pa-IN": EN_TEMPLATES,
  "pa": EN_TEMPLATES,
  "or-IN": EN_TEMPLATES,
  "or": EN_TEMPLATES,
}

/**
 * Generate a response message for a given intent and entities.
 */
export function generateResponse(
  intent: AssistantIntent,
  entities: ParsedEntities,
  language = "en-IN"
): string {
  const templates = LANGUAGE_TEMPLATES[language] || EN_TEMPLATES
  const template = templates[intent] || templates.unknown
  return template(entities)
}

/**
 * Generate a confirmation message for a pending action.
 */
export function generateConfirmationMessage(
  toolName: string,
  args: Record<string, unknown>,
  language = "en-IN"
): string {
  const entities: ParsedEntities = {
    amount: args.amount as number,
    category: args.category as string,
    vendor: args.vendor as string,
    name: args.name as string,
    date: args.date as string,
  }

  // Map tool name to intent for response generation
  const intentMap: Record<string, AssistantIntent> = {
    add_expense: "add_expense",
    add_income: "add_income",
    set_budget: "set_budget",
    update_budget: "update_budget",
    add_goal: "add_goal",
    add_investment: "add_investment",
    add_subscription: "add_subscription",
    add_insurance: "add_insurance",
  }

  const intent = intentMap[toolName] || "unknown"
  return generateResponse(intent, entities, language)
}
