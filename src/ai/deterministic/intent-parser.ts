// ── Intent Parser ───────────────────────────────────────────────────────
// Multi-language intent detection using pattern matching.
// Supports 12 Indian languages + English.

import type { AssistantIntent, ParsedIntent, ParsedEntities } from "@/shared/assistant"
import { normalizeText, extractAmount, extractDate, extractPeriod } from "./normalizer"
import { resolveDomain, resolveNavigation } from "@/ai/assistant/domains"

// ── Language-Specific Patterns ───────────────────────────────────────────

interface LanguagePatterns {
  greeting: RegExp[]
  small_talk: RegExp[]
  help: RegExp[]
  add_expense: RegExp[]
  add_income: RegExp[]
  set_budget: RegExp[]
  query_spending: RegExp[]
  query_budget: RegExp[]
  query_goals: RegExp[]
  query_net_worth: RegExp[]
  query_health: RegExp[]
  query_investments: RegExp[]
  query_income: RegExp[]
  query_transactions: RegExp[]
}

// Month names/abbreviations for period-aware queries ("july transactions").
const EN_MONTH =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?"

const EN_PATTERNS: LanguagePatterns = {
  greeting: [
    /^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste|namaskar|vanakkam)\b/i,
    /^(yo|sup|hola|howdy|greetings)\b/i,
  ],
  small_talk: [
    /\b(how are you|what's up|what are you|who are you|what can you do|thanks|thank you|bye|goodbye)\b/i,
    /\b(are you a bot|are you an ai|tell me a joke|help me)\b/i,
  ],
  help: [
    /\b(help|what can you|what do you|how do i|guide|tutorial|instructions)\b/i,
  ],
  add_expense: [
    /\b(spent|paid|bought|purchased|expense|expenditure|kharcha)\b.*\b\d+/i,
    /\b(add|record|log|track)\b.*\b(expense|spend|payment|purchase)\b/i,
    /\b(expense|spend)\b.*\b\d+/i,
    /\b\d+\b.*\b(spent|paid|bought|on)\b/i,
    // Natural entry sentences
    /\b(i|we)\b.*\b(spent|paid|bought|gave|tipped)\b/i,
    /\b(lunch|dinner|breakfast|groceries|rent|electricity|water|gas|petrol|fuel|uber|ola|taxi|auto|movie|shopping|medicine|doctor|hospital|school|college|internet|phone|mobile|recharge)\b.*\b\d+/i,
    /\d+.*\b(lunch|dinner|breakfast|groceries|rent|electricity|water|gas|petrol|fuel|uber|ola|taxi|auto|movie|shopping|medicine|doctor|hospital|school|college|internet|phone|mobile|recharge)\b/i,
    /\b(for|on|at|from)\b.*\b(expense|cost|bill|fee|charge|rent|emi)\b/i,
    /\b\w+\s*(rupees|rs|inr|₹)\b/i,
    /\b(kharcha|kiraya|bill|fee|charge)\b/i,
  ],
  add_income: [
    /\b(received|got|earned|salary|income|credit|bonus|incentive|refund|cashback)\b.*\b\d+/i,
    /\b(add|record|log)\b.*\b(income|salary|earning)\b/i,
    // Natural entry sentences
    /\b(i|we)\b.*\b(received|got|earned|won)\b/i,
    /\b(salary|wages|stipend|freelance|consulting|commission|dividend|interest|rental)\b.*\b(received|got|came|credit)\b/i,
    /\b(got\s*(paid|salary|bonus)|received\s*(payment|salary))\b/i,
  ],
  set_budget: [
    /\b(set|create|add|make)\b.*\b(budget|limit|cap)\b/i,
    /\b(budget)\b.*\b(for|on|of)\b.*\b\d+/i,
    /\b\d+.*\b(budget|limit|per month)\b/i,
    // Natural entry sentences
    /\b(my|our)\b.*\b(budget|limit)\b.*\b(should be|is|will be|for)\b/i,
    /\b(keep|limit|cap|restrict)\b.*\b(spend|spending|expense)\b/i,
    /\b(not exceed|under|within)\b.*\b\d+/i,
  ],
  query_spending: [
    /\b(how much|what.{0,3}s|show|tell|give).*(spent|spend|expense|expenditure|paid)\b/i,
    /\b(last|this|previous)\s+(month|week|year)\b.*\b(spend|paid|expense)/i,
    /\b(monthly|month)\s+(spend|expense|budget|expenses)\b/i,
    /\bwhere\b.*\b(spend|spent|money|expense)/i,
    /\b(total|overall)\s+(spend|spent|expense|expenses)\b/i,
    /\bspending\b/i,
    new RegExp(`\\b(${EN_MONTH})\\b.*\\b(spend|spent|expense|expenses|spending)\\b`, "i"),
  ],
  query_budget: [
    /\b(over|exceed|exceeding|exceeded|breach|went over)\b.*\b(budget|limit|spend)/i,
    /\bbudget\b.*\b(over|exceed|breach|status|remaining|left)\b/i,
    /\b(am i|are we)\b.*\bover\b/i,
    /\b(how much|what|show|remaining|left|balance)\b.*\b(budget|left)\b/i,
  ],
  query_goals: [
    /\b(goal|goals|save|saving|target|savings|progress|emergency fund)\b/i,
  ],
  query_net_worth: [
    /\b(net worth|wealth|total assets|total liabilities)\b/i,
  ],
  query_health: [
    /\b(health|score|health score|financial health)\b/i,
  ],
  query_investments: [
    /\b(invest|investment|investments|portfolio|sip|mutual fund|stock|equity|fd|fixed deposit)\b/i,
  ],
  query_income: [
    /\b(income|salary|earning|revenue|total income)\b/i,
  ],
  query_transactions: [
    /\b(last|recent|latest|past|previous)\s*(transaction|purchase|payment|expense|spend)/i,
    /\b(transaction|purchase|payment)s?\b.*\b(last|recent|latest|show|list|tell|what)/i,
    /\b(show|tell|give|list|what).*(transaction|purchase|payment)s?\b/i,
    /\bwhat did i (buy|purchase|pay|spend)/i,
    /\bwhere did i (spend|pay|buy)/i,
    new RegExp(`\\b(${EN_MONTH})\\b.*\\b(transaction|purchase|payment|expense)s?\\b`, "i"),
    new RegExp(`\\b(transaction|purchase|payment|expense)s?\\b.*\\b(${EN_MONTH})\\b`, "i"),
  ],
}

const HI_PATTERNS: LanguagePatterns = {
  greeting: [
    /\u0928\u092E\u0938\u094D\u0924\u0947/,  // नमस्ते
    /\u0928\u092E\u0938\u094D\u0915\u093E\u0930/,  // नमस्कार
    /\u0939\u0948\u0932\u094B/,  // हैलो
    /\u0917\u0941\u0921\s*\u092E\u0949\u0930\u0928\u093F\u0902\u0917/,  // गुड मॉर्निंग
  ],
  small_talk: [
    /\u0906\u092A \u0915\u0948\u0938\u0947 \u0939\u0948\u0902/,  // आप कैसे हैं
    /\u0915\u094D\u092F\u093E \u0939\u093E\u0932 \u0939\u0948/,  // क्या हाल है
    /\u0924\u0941\u092E\u094D\u0939\u093E\u0930\u0947/,  // धन्यवाद
  ],
  help: [
    /\u092E\u0926{2}/,  // मदद
    /\u0915\u094D\u092F\u093E \u0915\u0930\u0947\u0902/,  // क्या करें
  ],
  add_expense: [
    /\u0916\u0930\u094D\u091A\s+\u091C\u094B\u0921\u093C\u094B/,  // खर्च जोड़ो
    /\u0916\u0930\u094D\u091A.*\d+/,  // खर्च + number
    /\d+.*\u0930\u0941\u092A\u092F\u0947/,  // रुपये
    /\u092D\u0941\u0917\u0924\u093E\u0928/,  // भुगतान
    /\u0915\u093F\u0928\u093E/,  // किना (bought)
    /\u0916\u0930\u094D\u091A.*\u0915\u093F\u092F\u093E/,  // खर्च किया
    /\u092A\u0948\u0938\u093E.*\u0926\u093F\u092F\u093E/,  // पैसा दिया
  ],
  add_income: [
    /\u092E\u093F\u0932\u0940/,  // मिली
    /\u092E\u093F\u0932\u093E/,  // मिला
    /\u0924\u0928\u0916\u094D\u0935\u093E\u0939/,  // तनख्वाह
    /\u0906\u092E\u0926\u0928\u0940/,  // आमदनी
    /\u0938\u0948\u0932\u0947\u0930\u0940/,  // सैलरी
  ],
  set_budget: [
    /\u092C\u091C\u091F\s+\u0938\u0947\u091F/,  // बजट सेट
    /\u092C\u091C\u091F\s+\u092C\u0928\u093E\u0913/,  // बजट बनाओ
    /\u092C\u091C\u091F\s+\u0921\u093E\u0932\u094B/,  // बजट डालो
    /\u092C\u091C\u091F\s+\d+/,  // बजट + number
  ],
  query_spending: [
    // Hindi: "last month" + expenses/spending
    /\u092A\u093F\u091A\u093C\u0932\u0947\s+\u092E\u0939\u0940\u0928\u0947.*\u090F\u0915\u094D\u0938\u094D\u092A\u0947\u0902\u0938/,  // पिछले महीने...एक्सपेंसेस
    /\u092A\u093F\u091A\u093C\u0932\u0947\s+\u092E\u0939\u0940\u0928\u0947.*\u0916\u0930\u094D\u091A/,  // पिछले महीने...खर्च
    /\u0907\u0938\s+\u092E\u0939\u0940\u0928\u0947.*\u0916\u0930\u094D\u091A/,  // इस महीने...खर्च
    /\u0915\u093F\u0924\u0928\u093E.*\u0916\u0930\u094D\u091A/,  // कितना...खर्च
    /\u0915\u093F\u0924\u0928\u093E.*\u092E\u0947\u0902/,  // कितना...में
    /\u0916\u0930\u094D\u091A.*\u0926\u093F\u0916\u093E\u0913/,  // खर्च दिखाओ
    /\u0916\u0930\u094D\u091A.*\u092C\u0924\u093E\u0913/,  // खर्च बताओ
    /\u0916\u0930\u094D\u091A.*\u0915\u094D\u092F\u093E\s+\u0939\u0948/,  // खर्च क्या है
    /\u0916\u0930\u094D\u091A\s+\u0915\u0940\s+\u0938\u0942\u091A/,  // खर्च की सूची
    /\u0915\u0939\u093E\u0901\u091F\u0940.*\u0916\u0930\u094D\u091A/,  // कहाँंटी...खर्च
    /\u092A\u0948\u0938\u093E.*\u0915\u0939\u093E\u0901.*\u0917\u092F\u093E/,  // पैसा कहाँ गया
    /\u092E\u0947\u0930\u093E.*\u092A\u0948\u0938\u093E.*\u0915\u0939\u093E\u0901/,  // मेरा पैसा कहाँ
    /\u0916\u0930\u094D\u091A\s+\u092C\u0939\u0941\u0924\s+\u0939\u0948/,  // खर्च बहुत है
    /\u0916\u0930\u094D\u091A\s+\u091C\u094D\u092F\u093E\u0926\u093E/,  // खर्च ज़्यादा
    // Hinglish patterns (Hindi in Roman script)
    /\b(last|pichle)\s+(month|mahine)\b.*\b(expense|kharcha|spending)\b/i,
    /\b(kitna|how much)\b.*\b(kharcha|spent|expense)\b/i,
    /\b(kharcha|spending|expense)\b.*\b(dikhao|bataya|kya hai)\b/i,
    /\b(paisa|money)\b.*\b(kahan|where)\s*(gaya|went)\b/i,
    /\b(expense|kharcha)\b.*\b(is mahine|this month|pichle|last)\b/i,
  ],
  query_budget: [
    /\u092C\u091C\u091F.*\u0913\u0935\u0930/,  // बजट ओवर
    /\u092C\u091C\u091F.*\u091C\u094D\u092F\u093E\u0926\u093E/,  // बजट ज़्यादा
    /\u092C\u091C\u091F.*\u092C\u093E\u0915\u0940/,  // बजट बाकी
    /\u092C\u091C\u091F.*\u0936\u0947\u0937/,  // बजट शेष
    /\u092C\u091C\u091F.*\u0938\u094D\u091F\u0947\u091F\u0938/,  // बजट स्टेटस
    /\u092C\u091C\u091F.*\u0915\u0948\u0938\u0947\s+\u0939\u0948/,  // बजट कैसे है
    // Hinglish
    /\b(budget)\b.*\b(over|exceed|jyada|zyada|baaki|remaining)\b/i,
    /\b(am i|kya main)\b.*\b(over|budget)\b/i,
  ],
  query_goals: [
    /\u0932\u0915\u094D\u0937\u094D\u092F/,  // लक्ष्य
    /\u092C\u091A\u0924/,  // बचत
    /\u0917\u094B\u0932/,  // गोल
    /\u0921\u0947\u0921\u0932\u093E\u0907\u0928/,  // डेडलाइन
    /\u092A\u094D\u0930\u0917\u0924\u093F/,  // प्रगति
    // Hinglish
    /\b(goal|savings|target|bachat)\b/i,
  ],
  query_net_worth: [
    /\u0928\u0947\u091F.*\u0935\u0930\u094D\u0925/,  // नेट वर्थ
    /\u0915\u0941\u0932\s*\u0935\u0930\u094D\u0925/,  // कुल वर्थ
    /\u0938\u092E\u092A\u0924\u094D\u0924\u093E/,  // सम्पत्ता
    /\u0915\u0941\u0932\s*\u0938\u0902\u092A\u0924\u094D\u0924\u093F/,  // कुल सम्पत्ति
    // Hinglish
    /\b(net worth|sampanata|sampatti|wealth)\b/i,
  ],
  query_health: [
    /\u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F/,  // स्वास्थ्य
    /\u0938\u094D\u0915\u094B\u0930/,  // स्कोर
    /\u0935\u093F\u0924\u094D\u0924\u0940\u092F \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F/,  // वित्तीय स्वास्थ्य
    // Hinglish
    /\b(health|score|financial health)\b/i,
  ],
  query_investments: [
    /\u0928\u093F\u0935\u0947\u0936/,  // निवेश
    /\u092A\u094B\u0930\u094D\u091F\u092B\u094B\u0932\u093F\u092F\u094B/,  // पोर्टफोलियो
    /\u092E\u094D\u092F\u0942\u091A\u094D\u092F\u0942\u091C\u0932\s*\u092B\u0902\u0921/,  // म्यूचुअल फंड
    /\u0938\u0940\u090F\u092A/,  // SIP
    // Hinglish
    /\b(investment|invest|portfolio|sip|mutual fund|stock|fund)\b/i,
  ],
  query_income: [
    /\u0906\u092E\u0926\u0928\u0940/,  // आमदनी
    /\u0924\u0928\u0916\u094D\u0935\u093E\u0939/,  // तनख्वाह
    /\u0938\u0948\u0932\u0947\u0930\u0940/,  // सैलरी
    /\u0915\u092E\u093E\u0908/,  // कमाई
    // Hinglish
    /\b(income|salary|earning|kamai)\b/i,
  ],
  query_transactions: [
    /\u0932\u093E\u0938\u094D\u091F.*\u0932\u0947\u0928\u0926\u0947\u0935/,  // लास्ट लेनदेव
    /\u0932\u093E\u0938\u094D\u091F.*\u091F\u094D\u0930\u093E\u091C\u0948\u0915\u094D\u0936\u0928/,  // लास्ट ट्रांजैक्शन
    /\u0932\u093E\u0938\u094D\u091F.*\u092A\u0947\u092E\u0947\u0902\u091F/,  // लास्ट पेमेंट
    /\u092A\u093F\u091A\u093C\u0932\u0947.*\u0932\u0948\u0928.?\u0938\u0947\u0935/,  // पिछले लेनसेव
    /\u0939\u093E\u0932\s*\u0915\u094D\u093E\s*\u092E\u0948\u0902\u0928\u0947.*\u0916\u0930\u094D\u091A/,  // हाल का मैंने...खर्च
    // Hinglish
    /\b(last|recent|pichle|haal)\s*(transaction|payment|purchase|expense|kharcha)\b/i,
    /\b(show|dikhao|bataya)\b.*\b(transaction|payment|purchase|kharcha)\b/i,
    /\bwhat did i (buy|purchase|pay|spend|kharcha)\b/i,
  ],
}

/* eslint-disable unicorn/better-regex -- alternation needed to avoid no-misleading-character-class with combining marks */
const KN_PATTERNS: LanguagePatterns = {
  greeting: [
    /\u0CA8\u0CAE\u0CB8\u0CCD\u0C9F\u0CC6/,  // ನಮಸ್ತೆ
    /\u0CA8\u0CAE\u0CB8\u0CCD\u0C95\u0CBE\u0CB0/,  // ನಮಸ್ಕಾರ
    /\u0CB9\u0E3E\u0CAF\u0CCD/,  // ಹಾಯ್
  ],
  small_talk: [
    /\u0CB9\u0CC7\u0C97\u0CBE\s*\u0CBF\u0CB3\u0CCD\u0CA6\u0CCD\u0C95\u0CC6/,  // ಹೇಗಾ ಇದ್ದೀಕೆ
    /\u0CA4\u0C82\u0C95\u0CCD\u0CB8/,  // ಧನ್ಯವಾದ
    /\u0CB8\u0CB0\u0CBF/,  // ಸರಿ
  ],
  help: [
    /\u0CB8\u0CB9\u0CBE\u0CAF/,  // ಸಹಾಯ
    /\u0CAE\u0CBE\u0CA1\u0CBF/,  // ಮಾಡಿ
    /\u0CB9\u0CC7\u0C97\u0CC6/,  // ಹೇಗೆ
  ],
  add_expense: [
    /\u0CB6\u0C97\u0CCD\u0C9C\u0CC6/,  // ಖರ್ಚು
    /\u0CB0\u0CC2\u0CAA\u0CBE\u0CAF\u0CBF/,  // ರೂಪಾಯಿ
    /\u0C89\u0C9F\u0CCD\u0CA4\u0CBE\u0CA1\u0CC1/,  // ಊಟಕ್ಕೆ
    /\u0CAA\u0CBE\u0CB5\u0CA4\u0CBF\s*\u0DE3\u0CA6\u0CC6/,  // ಪಾವತಿ ಮಾಡಿದೆ
    /\u0C95\u0CCB\u0CA8\u0CC6/,  // ಕೊಂಡೆ
    /\u0CB6\u0C97\u0CCD\u0C9C\u0CC6\s*\u0CB8\u0CC7\u0CB0\u0CBF\u0CB8\u0CBF/,  // ಖರ್ಚು ಸೇರಿಸಿ
  ],
  add_income: [
    /\u0CB8\u0C82\u0CAC\u0CB3/,  // ಸಂಬಳ
    /\u0C86\u0CA6\u0CAF/,  // ಆದಾಯ
    /\u0CB8\u0CBF\u0C95\u0CCD\u0C95\u0CBF\u0CA4\u0CC1/,  // ಸಿಕ್ಕಿತು
    /\u0CA6\u0C97\u0CCD\u0CA6\u0CC1\s*\u0CAC\u0C82\u0CA4\u0CC1/,  // ದುಡ್ಡು ಬಂತು
  ],
  set_budget: [
    /\u0CAC\u0C9C\u0CC6\u0D9F\s*\u0CB9\u0E3E\u0C95\u0CC1/,  // ಬಜೆಟ್ ಹಾಕು
    /\u0CAC\u0C9C\u0CC6\u0D9F\s*\u0CAE\u0E3E\u0CA1\u0CC1/,  // ಬಜೆಟ್ ಮಾಡು
    /\u0CAC\u0C9C\u0CC6\u0D9F\s*\d+/,  // ಬಜೆಟ್ + number
  ],
  query_spending: [
    /\u0C8E\u0CB7\u0D9F\u0CC1\s*\u0CB6\u0C97\u0CCD\u0C9C\u0CC1/,  // ಎಷ್ಟು ಖರ್ಚು
    /\u0C88\s*\u0CA4\u0CBF\u0C82\u0C97\u0CB3\u0CC1\s*\u0CB6\u0C97\u0CCD\u0C9C\u0CC1/,  // ಈ ತಿಂಗಳು ಖರ್ಚು
    /\u0C95\u0CB3\u0CC6\u0CA6\s*\u0CA4\u0CBF\u0C82\u0C97\u0CB3\u0CC1/,  // ಕಳೆದ ತಿಂಗಳು
    /\u0CB6\u0C97\u0CCD\u0C9C\u0CC1\s*\u0D9F\u0CCB\u0CB0\u0CBF\u0CB8\u0CC1/,  // ಖರ್ಚು ತೋರಿಸು
    /\u0CB6\u0C97\u0CCD\u0C9C\u0CC1\s*\u0CB9\u0CC7\u0CB3\u0CC1/,  // ಖರ್ಚು ಹೇಳು
    /\u0CB9\u0C93\s*\u0CB5\u0CCD\u0C97\u0CBF\s*\u0CAC\u0C96\u0C97\u0CBE\u0CAF\u0CBF\u0D9F\u0CC1/,  // ಹಣ ಎಲ್ಲಿ ಹೋಯಿತು
    /\u0CB6\u0C97\u0CCD\u0C9C\u0CC1\s*\u0CAC\u0C97\u0C97\u0C9F\u0E23\u0CBF\u0CA6\u0CC1/,  // ಖರ್ಚು ಬಗ್ಗೆ ಹೇಳಿ
    /\u0CB6\u0C97\u0CCD\u0C9C\u0CC1\s*\u0C8E\u0CB7\u0D9F\u0CC1/,  // ಖರ್ಚು ಎಷ್ಟು
    // Kanglish (Kannada in Roman script)
    /\b(yellaru|estu)\s*(kharchu|spending)\b/i,
    /\b(last|kaleda)\s*(month|tina)\b.*\b(kharchu|expense)\b/i,
    /\b(kharchu)\b.*\b(thorsu|heLu|enu)\b/i,
    /\b(hana)\s*(ellide|hogayitu)\b/i,
  ],
  query_budget: [
    /\u0CAC\u0C9C\u0CC6\u0D9F\s*\u0CAE\u0CC0\u0CB0\u0CBF\u0CA6\u0CC6/,  // ಬಜೆಟ್ ಮೀರಿದೆ
    /\u0CAC\u0C9C\u0CC6\u0D9F\s*\u0C89\u0CB3\u0CBF\u0CA6\u0CBF\u0CA6\u0CC6/,  // ಬಜೆಟ್ ಉಳಿದಿದೆ
    /\u0CAC\u0C9C\u0CC6\u0D9F\s*\u0CB9\u0CC7\u0C97\u0CBF\u0CA6\u0CC6/,  // ಬಜೆಟ್ ಹೇಗಿದೆ
    /\u0CAC\u0C9C\u0CC6\u0D9F\s*\u0CB8\u0CD1\u0C95\u0CCD\u0CB7\u0CC6/,  // ಬಜೆಟ್ ಸ್ಥಿತಿ
    // Kanglish
    /\b(budget)\b.*\b(hoditha|meeri|ulli|baki|remaining)\b/i,
  ],
  query_goals: [
    /\u0C97\u0CC1\u0CB0\u0CBF/,  // ಗುರಿ
    /\u0C89\u0CB3\u0CBF\u0CA4\u0CBE\u0CAF/,  // ಉಳಿತಾಯ
    /\u0CAA\u0CCD\u0CB0\u0C97\u0CA4\u0CBF/,  // ಪ್ರಗತಿ
    /\u0C97\u0CC1\u0CB0\u0CBF\s*\u0CB9\u0CC7\u0C97\u0CBF\u0CA6\u0CC6/,  // ಗುರಿ ಹೇಗಿದೆ
    // Kanglish
    /\b(goal|savings|target|guri|ubacha)\b/i,
  ],
  query_net_worth: [
    /\u0CA8\u0CC6\u0D9F\s*\u0CB5\u0CB0\u0CCD\u0D9F\u0CCD/,  // ನೆಟ್ ವರ್ತ್
    /\u0CB8\u0C82\u0CAA\u0CA4\u0CCD\u0D9F\u0CC1/,  // ಸಂಪತ್ತು
    /\u0CB6\u0CCD\u0CB0\u0CC0\s*\u0CAE\u0CC8\u0CA4\u0CCD\u0CB0\u0CC6/,  // ಶ್ರೀಮಂತ
    // Kanglish
    /\b(net worth|sampanata|sampatti|wealth|eshtu)\b/i,
  ],
  query_health: [
    /\u0C86\u0CB0\u0CCB\u0C97\u0CDD\u0CAF/,  // ಆರೋಗ್ಯ
    /\u0CB8\u0CCD\u0C95\u0CCB\u0CB0\u0CCD/,  // ಸ್ಕೋರ್
    // Kanglish
    /\b(health|score|aarogya)\b/i,
  ],
  query_investments: [
    /\u0CB9\u0CC2\u0CA1\u0CBF\u0C95\u0CC6/,  // ಹೂಡಿಕೆ
    /\u0CAA\u0CCB\u0CB0\u0CCD\u0D9F\u200C\u0D2B\u0CCB\u0CB2\u0CBF\u0CAF\u0CCB/,  // ಪೋರ್ಟ್‌ಫೋಲಿಯೋ
    /\u0CAE\u0CCD\u0CAF\u0CC2\u0C9A\u0CCD\u0C9A\u0CC1\u0CB5\u0CB2\u0CCD\s*\u0D92\u0CA7\u0CCD/,  // ಮ್ಯೂಚುಯಲ್ ಫಂಡ್
    // Kanglish
    /\b(investment|invest|portfolio|sip|mutual fund|stock|fund|hudike)\b/i,
  ],
  query_income: [
    /\u0C86\u0CA6\u0CBE\u0CAF/,  // ಆದಾಯ
    /\u0CB8\u0C82\u0CAC\u0CB3/,  // ಸಂಬಳ
    /\u0CA6\u0C97\u0CCD\u0CA6\u0CC1\s*\u0CAC\u0C82\u0CA4\u0CC1/,  // ದುಡ್ಡು ಬಂತು
    // Kanglish
    /\b(income|salary|aadaya|sambala)\b/i,
  ],
  query_transactions: [
    /\u0C95\u0CCA\u0CA8\u0CC6\u0CAF\s*\u0CB5\u0CCD\u0CAF\u0CB5\u0CB9\u0CBE\u0CB0/,  // ಕೊನೆಯ ವ್ಯವಹಾರ
    /\u0C87\u0CA4\u0CCD\u0D9F\u0CC0\u0C9A\u0CBF\u0CA6\s*\u0CAD\u0CB0\u0CBF\u0CA6\u0CAF/,  // ಇತ್ತೀಚಿನ ಖರೀದಿ
    /\u0C95\u0CCA\u0CA8\u0CC6\u0CAF\s*\u0CAA\u0E3E\u0CB5\u0CA4\u0CBF/,  // ಕೊನೆಯ ಪಾವತಿ
    // Kanglish
    /\b(last|recent|haala)\s*(transaction|payment|purchase|kharchu)\b/i,
    /\b(show|thorsu|heLu)\b.*\b(transaction|payment|kharchu)\b/i,
  ],
}
/* eslint-enable unicorn/better-regex */

const TA_PATTERNS: LanguagePatterns = {
  greeting: [
    /\b(வணக்கம்|வணக்கம்\s*!)\b/,
    /\b(ஹாய்|ஹலோ)\b/,
  ],
  small_talk: [
    /\b(நன்றி|சொல்லுங்கள்|சரி)\b/,
    /\b(எப்படி\s*இருக்கீங்க|எப்படி\s*இருக்கிறீர்கள்)\b/,
  ],
  help: [
    /\b(உதவி|எப்படி|முடியுமா)\b/,
  ],
  add_expense: [
    /\b(செலவு|செலவழி)\b/,
    /\b(வாங்கினேன்|கொடுத்தேன்|பணம்\s*கொடுத்தேன்)\b/,
    /\d+.*\b(ரூபாய்|rs|₹)\b/,
    /\b(பட்ஜெட்|வரம்பு)\b/,
    /\b(எவ்வளவு|காண்பி|சொல்)\b.*\b(செலவு|பணம்)\b/,
  ],
  add_income: [
    /\b(பெற்றேன்|சம்பளம்|வருமானம்|வருவாய்)\b/,
    /\b(பணம்\s*வந்தது|சம்பளம்\s*வந்தது)\b/,
  ],
  set_budget: [
    /\b(அமை|உருவாக்கு|சேர்)\b.*\b(பட்ஜெட்|வரம்பு)\b/,
    /\b(பட்ஜெட்)\s*\d+/,
  ],
  query_spending: [
    /\b(எவ்வளவு|காட்டு|சொல்|சொல்லு)\b.*\b(செலவு|பணம்|வாங்கினேன்|கொடுத்தேன்)\b/,
    /\b(இந்த\s*மாதம்|கடந்த\s*மாதம்|கடந்த\s*வாரம்)\b.*\b(செலவு|எவ்வளவு)\b/,
    /\b(செலவு)\s*(எவ்வளவு|என்ன|எந்த\s*மாதம்)\b/,
    /\b(பணம்\s*எங்கே\s*போனது|எங்கே\s*செலவழித்தேன்)\b/,
    /\b(செலவு\s*பட்டியல்|செலவு\s*விவரம்)\b/,
  ],
  query_budget: [
    /\b(பட்ஜெட்)\b.*\b(மீறி|அதிகம்|மீதம|இருப்பு|எப்படி)\b/,
    /\b(பட்ஜெட்\s*முடிந்தது|பட்ஜெட்\s*தீர்ந்தது)\b/,
  ],
  query_goals: [
    /\b(இலக்கு|நோக்கம்|சேமிப்பு|முன்னேற்றம்)\b/,
    /\b(இலக்கு\s*எவ்வளவு|இலக்கு\s*எப்படி)\b/,
  ],
  query_net_worth: [
    /\b(நிகர\s*மதிப்பு|மொத்த\s*சொத்து|மொத்த\s*கடன்|நிகர\s*வர்த்)\b/,
    /\b(சொத்து\s*மதிப்பு|எனது\s*சொத்து)\b/,
  ],
  query_health: [
    /\b(ஆரோக்கியம்|ஸ்கோர்|நிதி\s*ஆரோக்கியம்)\b/,
  ],
  query_investments: [
    /\b(முதலீடு|போர்ட்ஃபோலியோ|SIP|மியூச்சுவல்\s*ஃபண்ட்)\b/,
    /\b(முதலீடு\s*எவ்வளவு|முதலீடு\s*எப்படி)\b/,
  ],
  query_income: [
    /\b(வருமானம்|சம்பளம்|வருவாய்)\b/,
    /\b(சம்பளம்\s*எவ்வளவு|வருமானம்\s*என்ன)\b/,
  ],
  query_transactions: [
    /\b(கடைசி|சமீபத்திய|கடந்த)\b.*\b(பரிவர்த்தனை|வாங்குதல்|பணம்|பேமெண்ட்)\b/,
    /\b(பரிவர்த்தனை|வாங்குதல்)\b.*\b(காண்பி|சொல்|என்ன)\b/,
    /\b(நான்\s*என்ன\s*வாங்கினேன்|கடைசி\s*வாங்குதல்)\b/,
  ],
}

const TE_PATTERNS: LanguagePatterns = {
  greeting: [
    /\b(నమస్కారం|నమస్తే)\b/,
    /\b(హాయ్|హలో)\b/,
  ],
  small_talk: [
    /\b(ధన్యవాదాలు|సరే|చెప్పండి)\b/,
    /\b(ఎలా\s*ఉన్నారు|ఎలా\s*ఉన్నావు)\b/,
  ],
  help: [
    /\b(సహాయం|ఎలా|సాయం)\b/,
  ],
  add_expense: [
    /\b(ఖర్చు|ఖర్చు\s*చేశాను)\b/,
    /\b(చెల్లించాను|కొన్నాను|ఇచ్చాను)\b/,
    /\d+.*\b(రూపాయలు|rs|₹)\b/,
    /\b(ఎంత|చూపించు|చెప్పు)\b.*\b(ఖర్చు|చెల్లింపు|డబ్బు)\b/,
  ],
  add_income: [
    /\b(పొందాను|జీతం|ఆదాయం|సంపాదన)\b/,
    /\b(జీతం\s*వచ్చింది|డబ్బు\s*వచ్చింది)\b/,
  ],
  set_budget: [
    /\b(సెట్|సృష్టించు|జోడించు)\b.*\b(బడ్జెట్|పరిమితి)\b/,
    /\b(బడ్జెట్)\s*\d+/,
  ],
  query_spending: [
    /\b(ఎంత|చూపించు|చెప్పు)\b.*\b(ఖర్చు|చెల్లింపు|డబ్బు)\b/,
    /\b(ఈ\s*నెల|గత\s*నెల|గత\s*వారం)\b.*\b(ఖర్చు|ఎంత)\b/,
    /\b(డబ్బు\s*ఎక్కడికి\s*పోయింది|ఎక్కడ\s*ఖర్చు\s*చేశాను)\b/,
  ],
  query_budget: [
    /\b(బడ్జెట్)\b.*\b(మించి|ఎక్కువ|మిగిలి|ఉన్న|ఎలా)\b/,
    /\b(బడ్జెట్\s*అయిపోయింది|బడ్జెట్\s*మిగిలింది)\b/,
  ],
  query_goals: [
    /\b(లక్ష్యం|ఉద్దేశ్యం|పొదుపు|పురోగతి)\b/,
    /\b(లక్ష్యం\s*ఎంత|లక్ష్యం\s*ఎలా)\b/,
  ],
  query_net_worth: [
    /\b(నెట్\s*వర్త్|మొత్తం\s*ఆస్తి|మొత్తం\s*అప్పు)\b/,
    /\b(ఆస్తి\s*విలువ|నా\s*ఆస్తి)\b/,
  ],
  query_health: [
    /\b(ఆరోగ్యం|స్కోర్|ఆర్థిక\s*ఆరోగ్యం)\b/,
  ],
  query_investments: [
    /\b(పెట్టుబడి|పోర్ట్\u200Cఫోలియో|SIP|మ్యూచువల్\s*ఫండ్)\b/,
    /\b(పెట్టుబడి\s*ఎంత|పెట్టుబడి\s*ఎలా)\b/,
  ],
  query_income: [
    /\b(ఆదాయం|జీతం|సంపాదన)\b/,
    /\b(జీతం\s*ఎంత|ఆదాయం\s*ఎన్ని)\b/,
  ],
  query_transactions: [
    /\b(చివరి|ఇటీవలి|గత)\b.*\b(లావుదేవీ|కొనుగోలు|చెల్లింపు|పేమెంట్)\b/,
    /\b(లావుదేవీ|కొనుగోలు)\b.*\b(చూపించు|చెప్పు|ఏమిటి)\b/,
    /\b(నేను\s*ఏమి\s*కొన్నాను|చివరి\s*కొనుగోలు)\b/,
  ],
}

const BN_PATTERNS: LanguagePatterns = {
  greeting: [
    /\b(নমস্কার|নমস্তে|নমস্কার\s*!)\b/,
    /\b(হাই|হ্যালো)\b/,
  ],
  small_talk: [
    /\b(ধন্যবাদ|ঠিক আছে|বলুন)\b/,
    /\b(কেমন আছেন|কেমন আছো)\b/,
  ],
  help: [
    /\b(সাহায্য|কিভাবে|সাহায্য করুন)\b/,
  ],
  add_expense: [
    /\b(খরচ|খরচ\s*করেছি)\b/,
    /\b(পেমেন্ট|কিনেছি|দিয়েছি)\b/,
    /\d+.*\b(টাকা|rs|₹)\b/,
    /\b(কত|দেখাও|বল)\b.*\b(খরচ|পেমেন্ট|টাকা)\b/,
  ],
  add_income: [
    /\b(পেয়েছি|বেতন|আয়)\b/,
    /\b(বেতন\s*এসেছে|টাকা\s*এসেছে)\b/,
  ],
  set_budget: [
    /\b(সেট|তৈরি|যোগ)\b.*\b(বাজেট|সীমা)\b/,
    /\b(বাজেট)\s*\d+/,
  ],
  query_spending: [
    /\b(কত|দেখাও|বল)\b.*\b(খরচ|পেমেন্ট|টাকা)\b/,
    /\b(এই\s*মাসে|গত\s*মাসে|গত\s*সপ্তাহে)\b.*\b(খরচ|কত)\b/,
    /\b(টাকা\s*কোথায়\s*গেছে|কোথায়\s*খরচ\s*করেছি)\b/,
  ],
  query_budget: [
    /\b(বাজেট)\b.*\b(বেশি|অতিক্রান্ত|বাকি|অবশিষ্ট|কেমন)\b/,
    /\b(বাজেট\s*শেষ|বাজেট\s*বেশি)\b/,
  ],
  query_goals: [
    /\b(লক্ষ্য|উদ্দেশ্য|সঞ্চয়|অগ্রগতি)\b/,
    /\b(লক্ষ্য\s*কত|লক্ষ্য\s*কেমন)\b/,
  ],
  query_net_worth: [
    /\b(নেট\s*ওয়ার্থ|মোট\s*সম্পদ|মোট\s*ঋণ)\b/,
    /\b(সম্পদ\s*মূল্য|আমার\s*সম্পদ)\b/,
  ],
  query_health: [
    /\b(স্বাস্থ্য|স্কোর|আর্থিক\s*স্বাস্থ্য)\b/,
  ],
  query_investments: [
    /\b(বিনিয়োগ|পোর্টফোলিও|SIP|মিউচুয়াল\s*ফান্ড)\b/,
    /\b(বিনিয়োগ\s*কত|বিনিয়োগ\s*কেমন)\b/,
  ],
  query_income: [
    /\b(আয়|বেতন|উপার্জন)\b/,
    /\b(বেতন\s*কত|আয়\s*কেমন)\b/,
  ],
  query_transactions: [
    /\b(শেষ|সাম্প্রতিক|গত)\b.*\b(লেনদেন|ক্রয়|পেমেন্ট|ট্রানজেকশন)\b/,
    /\b(লেনদেন|ক্রয়)\b.*\b(দেখাও|বল|কী)\b/,
    /\b(আমি\s*কী\s*কিনেছি|শেষ\s*ক্রয়)\b/,
  ],
}

const MR_PATTERNS: LanguagePatterns = {
  greeting: [
    /\b(नमस्कार|नमस्ते)\b/,
    /\b(हाय|हॅलो)\b/,
  ],
  small_talk: [
    /\b(धन्यवाद|ठीक आहे|सांगा)\b/,
    /\b(कसे आहात|काय चाललं)\b/,
  ],
  help: [
    /\b(मदत|कसे|मदत करा)\b/,
  ],
  add_expense: [
    /\b(खर्च|खर्च\s*केला)\b/,
    /\b(पेमेंट|विकत घेतले|दिले)\b/,
    /\d+.*\b(रुपये|rs|₹)\b/,
    /\b(किती|दाखवा|सांगा)\b.*\b(खर्च|पेमेंट|पैसे)\b/,
  ],
  add_income: [
    /\b(मिळाले|प्राप्त झाले|पगार|उत्पन्न)\b/,
    /\b(पगार\s*आला|पैसे\s*आले)\b/,
  ],
  set_budget: [
    /\b(सेट|तयार|जोडा)\b.*\b(बजेट)\b/,
    /\b(बजेट)\s*\d+/,
  ],
  query_spending: [
    /\b(किती|दाखवा|सांगा)\b.*\b(खर्च|पेमेंट|पैसे)\b/,
    /\b(या\s*महिन्यात|गेल्या\s*महिन्यात|गेल्या\s*आठवड्यात)\b.*\b(खर्च|किती)\b/,
    /\b(पैसे\s*कुठे\s*गेले|कुठे\s*खर्च\s*केला)\b/,
  ],
  query_budget: [
    /\b(बजेट)\b.*\b(ओव्हर|जास्त|शिल्लक|उर्वरित|कसा)\b/,
    /\b(बजेट\s*संपला|बजेट\s*जास्त)\b/,
  ],
  query_goals: [
    /\b(ध्येय|उद्देश|बचत|प्रगती)\b/,
    /\b(ध्येय\s*किती|ध्येय\s*कसे)\b/,
  ],
  query_net_worth: [
    /\b(नेट\s*वर्थ|एकूण\s*मालमत्ता|एकूण\s*कर्ज)\b/,
    /\b(मालमत्तेची\s*किंमत|माझी\s*मालमत्ता)\b/,
  ],
  query_health: [
    /\b(आरोग्य|स्कोर|आर्थिक\s*आरोग्य)\b/,
  ],
  query_investments: [
    /\b(गुंतवणूक|पोर्टफोलिओ|SIP)\b/,
    /\b(गुंतवणूक\s*किती|गुंतवणूक\s*कसी)\b/,
  ],
  query_income: [
    /\b(उत्पन्न|पगार|कमाई)\b/,
    /\b(पगार\s*किती|कमाई\s*किती)\b/,
  ],
  query_transactions: [
    /\b(शेवटचे|अलीकडील|मागील)\b.*\b(व्यवहार|खरेदी|पेमेंट|ट्रान्झॅक्शन)\b/,
    /\b(व्यवहार|खरेदी)\b.*\b(दाखवा|सांगा|काय)\b/,
    /\b(मी\s*काय\s*विकतले|शेवटची\s*खरेदी)\b/,
  ],
}

const UR_PATTERNS: LanguagePatterns = {
  greeting: [
    /\b(السلام\s*عليكم|سلام|نمستے)\b/,
    /\b(ہائی|ہیلو)\b/,
  ],
  small_talk: [
    /\b(شکریہ|ٹھیک\s*ہے|بولیں)\b/,
    /\b(کیسے\s*ہیں|کیا\s*حال\s*ہے)\b/,
  ],
  help: [
    /\b(مدد|کیسے|مدد\s*کریں)\b/,
  ],
  add_expense: [
    /\b(خرچ|خرچہ\s*کیا)\b/,
    /\b(ادائیگی|خریدا|دیا)\b/,
    /\d+.*\b(روپے|rs|₹)\b/,
    /\b(کتنا|دکھاؤ|بتائیں)\b.*\b(خرچ|ادائیگی|پیسے)\b/,
  ],
  add_income: [
    /\b(ملی|تنخواہ|آمدنی|کمائی)\b/,
    /\b(تنخواہ\s*آئی|پیسے\s*آئے)\b/,
  ],
  set_budget: [
    /\b(سیٹ|بنائیں|شامل\s*کریں)\b.*\b(بجٹ|حد)\b/,
    /\b(بجٹ)\s*\d+/,
  ],
  query_spending: [
    /\b(کتنا|دکھاؤ|بتائیں)\b.*\b(خرچ|ادائیگی|پیسے)\b/,
    /\b(اس\s*ماہ|گزشتہ\s*ماہ|گزشتہ\s*ہفتے)\b.*\b(خرچ|کتنا)\b/,
    /\b(پیسے\s*کہاں\s*گئے|کہاں\s*خرچ\s*کیا)\b/,
  ],
  query_budget: [
    /\b(بجٹ)\b.*\b(زیادہ|ختم|باقی|کیسا)\b/,
    /\b(بجٹ\s*ختم|بجٹ\s*زیادہ)\b/,
  ],
  query_goals: [
    /\b(ہدف|مقصد|بچت|پیشرفت)\b/,
    /\b(ہدف\s*کتنا|ہدف\s*کیسا)\b/,
  ],
  query_net_worth: [
    /\b(نیٹ\s*ورتھ|کل\s*ثروت|کل\s*قرض)\b/,
  ],
  query_health: [
    /\b(صحت|اسکور|مالی\s*صحت)\b/,
  ],
  query_investments: [
    /\b(سرمایہ کاری|پورٹ فولیو|SIP|میوچل\s*فنڈ)\b/,
  ],
  query_income: [
    /\b(آمدنی|تنخواہ|کمائی)\b/,
    /\b(تنخواہ\s*کتنا|کمائی\s*کتنی)\b/,
  ],
  query_transactions: [
    /\b(آخری|حالیہ|گزشتہ)\b.*\b(لین دین|خریداری|ادائیگی)\b/,
    /\b(لین دین|خریداری)\b.*\b(دکھاؤ|بتائیں|کیا)\b/,
  ],
}

const ML_PATTERNS: LanguagePatterns = {
  greeting: [
    /\b(നമസ്കാരം|നമസ്തേ)\b/,
    /\b(ഹായ്|ഹലോ)\b/,
  ],
  small_talk: [
    /\b(നന്ദി|ശരി|പറയൂ)\b/,
    /\b(എങ്ങനെ\s*ഇരിക്കുന്നു|എങ്ങനെ\s*ഉണ്ട്)\b/,
  ],
  help: [
    /\b(സഹായം|എങ്ങനെ|സഹായിക്കൂ)\b/,
  ],
  add_expense: [
    /\b(ചെലവ്|ചെലവാക്കി)\b/,
    /\b(പേയ്‌മെന്റ്|വാങ്ങി|കൊടുത്തു)\b/,
    /\d+.*\b(രൂപ|rs|₹)\b/,
    /\b(എത്ര|കാണിക്കൂ|പറയൂ)\b.*\b(ചെലവ്|പേയ്‌മെന്റ്|പണം)\b/,
  ],
  add_income: [
    /\b(കിട്ടി|ശമ്പളം|വരുമാനം)\b/,
    /\b(ശമ്പളം\s*വന്നു|പണം\s*വന്നു)\b/,
  ],
  set_budget: [
    /\b(സെറ്റ്|ഉണ്ടാക്കൂ|ചേർക്കൂ)\b.*\b(ബഡ്ജറ്റ്|പരിധി)\b/,
    /\b(ബഡ്ജറ്റ്)\s*\d+/,
  ],
  query_spending: [
    /\b(എത്ര|കാണിക്കൂ|പറയൂ)\b.*\b(ചെലവ്|പേയ്‌മെന്റ്|പണം)\b/,
    /\b(ഈ\s*മാസം|കഴിഞ്ഞ\s*മാസം|കഴിഞ്ഞ\s*ആഴ്ച)\b.*\b(ചെലവ്|എത്ര)\b/,
    /\b(പണം\s*എവിടെ\s*പോയി|എവിടെ\s*ചെലവാക്കി)\b/,
  ],
  query_budget: [
    /\b(ബഡ്ജറ്റ്)\b.*\b(കൂടുതൽ|കഴിഞ്ഞ്|ബാക്കി|എങ്ങനെ)\b/,
    /\b(ബഡ്ജറ്റ്\s*തീർന്നു|ബഡ്ജറ്റ്\s*കൂടുതൽ)\b/,
  ],
  query_goals: [
    /\b(ലക്ഷ്യം|ഉദ്ദേശം|സമ്പാദ്യം|പുരോഗതി)\b/,
    /\b(ലക്ഷ്യം\s*എത്ര|ലക്ഷ്യം\s*എങ്ങനെ)\b/,
  ],
  query_net_worth: [
    /\b(നെറ്റ്\s*വർത്ത്|മൊത്തം\s*സ്വത്ത്|മൊത്തം\s*കടം)\b/,
  ],
  query_health: [
    /\b(ആരോഗ്യം|സ്കോർ|സാമ്പത്തിക\s*ആരോഗ്യം)\b/,
  ],
  query_investments: [
    /\b(നിക്ഷേപം|പോർട്ട്\u200Cഫോളിയോ|SIP|മ്യൂച്വൽ\s*ഫണ്ട്)\b/,
  ],
  query_income: [
    /\b(വരുമാനം|ശമ്പളം)\b/,
    /\b(ശമ്പളം\s*എത്ര|വരുമാനം\s*എത്ര)\b/,
  ],
  query_transactions: [
    /\b(അവസാന|സമീപകാല|കഴിഞ്ഞ)\b.*\b(ഇടപാട്|വാങ്ങൽ|പേയ്‌മെന്റ്)\b/,
    /\b(ഇടപാട്|വാങ്ങൽ)\b.*\b(കാണിക്കൂ|പറയൂ|എന്ത്)\b/,
  ],
}

const GU_PATTERNS: LanguagePatterns = {
  greeting: [
    /\b(નમસ્તે|નમસ્કાર)\b/,
    /\b(હાય|હેલો)\b/,
  ],
  small_talk: [
    /\b(આભાર|ઠીક છે|બોલો)\b/,
    /\b(કેમ છો|શું ચાલે છે)\b/,
  ],
  help: [
    /\b(મદદ|કેવી રીતે|મદદ કરો)\b/,
  ],
  add_expense: [
    /\b(ખર્ચ|ખર્ચ કર્યો)\b/,
    /\b(પેમેન્ટ|ખરીદ્યું|આપ્યું)\b/,
    /\d+.*\b(રૂપિયા|rs|₹)\b/,
    /\b(કેટલું|બતાવો|કહો)\b.*\b(ખર્ચ|પેમેન્ટ|પૈસા)\b/,
  ],
  add_income: [
    /\b(મળ્યું|પગાર|આવક)\b/,
    /\b(પગાર આવ્યો|પૈસા આવ્યા)\b/,
  ],
  set_budget: [
    /\b(સેટ|બનાવો|ઉમેરો)\b.*\b(બજેટ|મર્યાદા)\b/,
    /\b(બજેટ)\s*\d+/,
  ],
  query_spending: [
    /\b(કેટલું|બતાવો|કહો)\b.*\b(ખર્ચ|પેમેન્ટ|પૈસા)\b/,
    /\b(આ\s*મહિને|ગયા\s*મહિને|ગયા\s*અઠવાડિયે)\b.*\b(ખર્ચ|કેટલું)\b/,
    /\b(પૈસા\s*ક્યાં ગયા|ક્યાં\s*ખર્ચ કર્યો)\b/,
  ],
  query_budget: [
    /\b(બજેટ)\b.*\b(વધારે|ખૂટ્યું|બાકી|કેવું)\b/,
    /\b(બજેટ ખૂટ્યું|બજેટ વધારે)\b/,
  ],
  query_goals: [
    /\b(લક્ષ્ય|હેતુ|બચત|પ્રગતિ)\b/,
    /\b(લક્ષ્ય કેટલું|લક્ષ્ય કેવું)\b/,
  ],
  query_net_worth: [
    /\b(નેટ\s*વર્થ|કુલ\s*સંપત્તિ|કુલ\s*દેવું)\b/,
  ],
  query_health: [
    /\b(આરોગ્ય|સ્કોર|નાણાકીય\s*આરોગ્ય)\b/,
  ],
  query_investments: [
    /\b(રોકાણ|પોર્ટફોલિયો|SIP|મ્યુચ્યુઅલ\s*ફંડ)\b/,
  ],
  query_income: [
    /\b(આવક|પગાર|કમાણી)\b/,
    /\b(પગાર કેટલો|આવક કેટલી)\b/,
  ],
  query_transactions: [
    /\b(છેલ્લી|તાજેતરની|ગયા)\b.*\b(વ્યવહાર|ખરીદી|પેમેન્ટ)\b/,
    /\b(વ્યવહાર|ખરીદી)\b.*\b(બતાવો|કહો|શું)\b/,
  ],
}

const PA_PATTERNS: LanguagePatterns = {
  greeting: [
    /\b(ਸਤ ਸ੍ਰੀ ਅਕਾਲ|ਨਮਸਤੇ)\b/,
    /\b(ਹਾਏ|ਹੈਲੋ)\b/,
  ],
  small_talk: [
    /\b(ਧੰਨਵਾਦ|ਠੀਕ ਹੈ|ਦੱਸੋ)\b/,
    /\b(ਕਿਵੇਂ ਹੋ|ਕਿਹੜਾ ਹਾਲ ਹੈ)\b/,
  ],
  help: [
    /\b(ਮਦਦ|ਕਿਵੇਂ|ਮਦਦ ਕਰੋ)\b/,
  ],
  add_expense: [
    /\b(ਖਰਚ|ਖਰਚਾ\s*ਕੀਤਾ)\b/,
    /\b(ਭੁਗਤਾਨ|ਖਰੀਦਿਆ|ਦਿੱਤਾ)\b/,
    /\d+.*\b(ਰੁਪਏ|rs|₹)\b/,
    /\b(ਕਿੰਨਾ|ਦਿਖਾਓ|ਦੱਸੋ)\b.*\b(ਖਰਚ|ਭੁਗਤਾਨ|ਪੈਸੇ)\b/,
  ],
  add_income: [
    /\b(ਮਿਲਿਆ|ਤਨਖ਼ਾਹ|ਆਮਦਨ)\b/,
    /\b(ਤਨਖ਼ਾਹ ਆਈ|ਪੈਸੇ ਆਏ)\b/,
  ],
  set_budget: [
    /\b(ਸੈੱਟ|ਬਣਾਓ|ਜੋੜੋ)\b.*\b(ਬਜਟ|ਹੱਦ)\b/,
    /\b(ਬਜਟ)\s*\d+/,
  ],
  query_spending: [
    /\b(ਕਿੰਨਾ|ਦਿਖਾਓ|ਦੱਸੋ)\b.*\b(ਖਰਚ|ਭੁਗਤਾਨ|ਪੈਸੇ)\b/,
    /\b(ਇਸ\s*ਮਹੀਨੇ|ਪਿਛਲੇ\s*ਮਹੀਨੇ|ਪਿਛਲੇ\s*ਹਫ਼ਤੇ)\b.*\b(ਖਰਚ|ਕਿੰਨਾ)\b/,
    /\b(ਪੈਸੇ\s*ਕਿੱਥੇ\s*ਗਏ|ਕਿੱਥੇ\s*ਖਰਚ\s*ਕੀਤਾ)\b/,
  ],
  query_budget: [
    /\b(ਬਜਟ)\b.*\b(ਜ਼ਿਆਦਾ|ਖ਼ਤਮ|ਬਾਕੀ|ਕਿਵੇਂ)\b/,
    /\b(ਬਜਟ ਖ਼ਤਮ|ਬਜਟ ਜ਼ਿਆਦਾ)\b/,
  ],
  query_goals: [
    /\b(ਮਕਸਦ|ਉਦੇਸ਼|ਬੱਚਤ|ਪ੍ਰਗਤੀ)\b/,
    /\b(ਮਕਸਦ ਕਿੰਨਾ|ਮਕਸਦ ਕਿਵੇਂ)\b/,
  ],
  query_net_worth: [
    /\b(ਨੈੱਟ\s*ਵਰਥ|ਕੁੱਲ\s*ਸੰਪੱਤੀ|ਕੁੱਲ\s*ਕਰਜ਼ਾ)\b/,
  ],
  query_health: [
    /\b(ਸਿਹਤ|ਸਕੋਰ|ਆਰਥਿਕ\s*ਸਿਹਤ)\b/,
  ],
  query_investments: [
    /\b(ਨਿਵੇਸ਼|ਪੋਰਟਫੋਲੀਓ|SIP|ਮਿਊਚੁਅਲ\s*ਫੰਡ)\b/,
  ],
  query_income: [
    /\b(ਆਮਦਨ|ਤਨਖ਼ਾਹ|ਕਮਾਈ)\b/,
    /\b(ਤਨਖ਼ਾਹ ਕਿੰਨੀ|ਆਮਦਨ ਕਿੰਨੀ)\b/,
  ],
  query_transactions: [
    /\b(ਆਖਰੀ|ਤਾਜ਼ਾ|ਪਿਛਲਾ)\b.*\b(ਲੇਣ-ਦੇਣ|ਖਰੀਦਦਾਰੀ|ਭੁਗਤਾਨ)\b/,
    /\b(ਲੇਣ-ਦੇਣ|ਖਰੀਦਦਾਰੀ)\b.*\b(ਦਿਖਾਓ|ਦੱਸੋ|ਕੀ)\b/,
  ],
}

const OR_PATTERNS: LanguagePatterns = {
  greeting: [
    /\b(ନମସ୍କାର|ନମସ୍ତେ)\b/,
    /\b(ହାଏ|ହେଲୋ)\b/,
  ],
  small_talk: [
    /\b(ଧନ୍ୟବାଦ|ଠିକ ଅଛି|କୁହନ୍ତୁ)\b/,
    /\b(କେମିତି ଅଛନ୍ତି|କଣ ଚାଲିଛି)\b/,
  ],
  help: [
    /\b(ସାହାଯ୍ୟ|କିପରି|ସାହାଯ୍ୟ କରନ୍ତୁ)\b/,
  ],
  add_expense: [
    /\b(ଖର୍ଚ୍ଚ|ଖର୍ଚ୍ଚ କଲି)\b/,
    /\b(ପେମେଣ୍ଟ|କିଣିଲି|ଦେଲି)\b/,
    /\d+.*\b(ଟଙ୍କା|rs|₹)\b/,
    /\b(କେତେ|ଦେଖାନ୍ତୁ|କୁହନ୍ତୁ)\b.*\b(ଖର୍ଚ୍ଚ|ପେମେଣ୍ଟ|ପଇସା)\b/,
  ],
  add_income: [
    /\b(ମିଳିଲା|ଦରମା|ଆୟ)\b/,
    /\b(ଦରମା ଆସିଲା|ପଇସା ଆସିଲା)\b/,
  ],
  set_budget: [
    /\b(ସେଟ|ତିଆରି|ଯୋଡ଼ନ୍ତୁ)\b.*\b(ବଜେଟ|ସୀମା)\b/,
    /\b(ବଜେଟ)\s*\d+/,
  ],
  query_spending: [
    /\b(କେତେ|ଦେଖାନ୍ତୁ|କୁହନ୍ତୁ)\b.*\b(ଖର୍ଚ୍ଚ|ପେମେଣ୍ଟ|ପଇସା)\b/,
    /\b(ଏହି\s*ମାସରେ|ଗତ\s*ମାସରେ|ଗତ\s*ସପ୍ତାହରେ)\b.*\b(ଖର୍ଚ୍ଚ|କେତେ)\b/,
    /\b(ପଇସା\s*କୁଆଁଡ଼ି\s*ଗଲା|କୁଆଁଡ଼ି\s*ଖର୍ଚ୍ଚ କଲି)\b/,
  ],
  query_budget: [
    /\b(ବଜେଟ)\b.*\b(ଅଧିକ|ଶେଷ|ବାକି|କେମିତି)\b/,
  ],
  query_goals: [
    /\b(ଲକ୍ଷ୍ୟ|ଉଦ୍ଦେଶ୍ୟ|ସଞ୍ଚୟ|ଅଗ୍ରଗତି)\b/,
  ],
  query_net_worth: [
    /\b(ନେଟ୍\s*ୱାର୍ଥ|ମୋଟ\s*ସମ୍ପତ୍ତି|ମୋଟ\s*ଋଣ)\b/,
  ],
  query_health: [
    /\b(ସ୍ୱାସ୍ଥ୍ୟ|ସ୍କୋର|ଆର୍ଥିକ\s*ସ୍ୱାସ୍ଥ୍ୟ)\b/,
  ],
  query_investments: [
    /\b(ନିବେଶ|ପୋର୍ଟଫୋଲିଓ|SIP|ମ୍ୟୁଚୁଆଲ୍\s*ଫଣ୍ଡ)\b/,
  ],
  query_income: [
    /\b(ଆୟ|ଦରମା|ଉପାର୍ଜନ)\b/,
  ],
  query_transactions: [
    /\b(ଶେଷ|ସାମ୍ପ୍ରତିକ|ଗତ)\b.*\b(ଲେଣଦେଣ|କ୍ରୟ|ପେମେଣ୍ଟ)\b/,
    /\b(ଲେଣଦେଣ|କ୍ରୟ)\b.*\b(ଦେଖାନ୍ତୁ|କୁହନ୍ତୁ|କଣ)\b/,
  ],
}

// ── Pattern Map ─────────────────────────────────────────────────────────

const LANGUAGE_PATTERN_MAP: Record<string, LanguagePatterns> = {
  "en-IN": EN_PATTERNS,
  "en": EN_PATTERNS,
  "hi-IN": HI_PATTERNS,
  "hi": HI_PATTERNS,
  "kn-IN": KN_PATTERNS,
  "kn": KN_PATTERNS,
  "ta-IN": TA_PATTERNS,
  "ta": TA_PATTERNS,
  "te-IN": TE_PATTERNS,
  "te": TE_PATTERNS,
  "bn-IN": BN_PATTERNS,
  "bn": BN_PATTERNS,
  "mr-IN": MR_PATTERNS,
  "mr": MR_PATTERNS,
  "ur-IN": UR_PATTERNS,
  "ur": UR_PATTERNS,
  "ml-IN": ML_PATTERNS,
  "ml": ML_PATTERNS,
  "gu-IN": GU_PATTERNS,
  "gu": GU_PATTERNS,
  "pa-IN": PA_PATTERNS,
  "pa": PA_PATTERNS,
  "or-IN": OR_PATTERNS,
  "or": OR_PATTERNS,
}

// ── Intent Detection ────────────────────────────────────────────────────

/**
 * Detect intent from text input using language-specific patterns.
 */
export function detectIntent(text: string, language = "en-IN"): ParsedIntent {
  const normalized = normalizeText(text)
  const patterns = LANGUAGE_PATTERN_MAP[language] || EN_PATTERNS

  // Explicit navigation wins: "open budgets", "go to loans", "take me to tax".
  if (/\b(open|go to|goto|navigate to|take me to|jump to)\b/i.test(normalized)) {
    const nav = resolveNavigation(normalized)
    if (nav) {
      return {
        intent: "navigate",
        confidence: "high",
        entities: { ...extractEntities(normalized), path: nav.path, name: nav.label },
      }
    }
  }

  // Check each intent pattern, return first match with highest confidence
  const intents: Array<{ intent: AssistantIntent; confidence: "high" | "medium" | "low" }> = []

  for (const [intentName, regexes] of Object.entries(patterns)) {
    for (const regex of regexes) {
      if (regex.test(normalized)) {
        // First match = high confidence, subsequent = medium/low
        const confidence = intents.length === 0 ? "high" : intents.length === 1 ? "medium" : "low"
        intents.push({
          intent: intentName as AssistantIntent,
          confidence,
        })
        break // One match per intent is enough
      }
    }
  }

  // If no intent matched, try a data domain (deterministic, no LLM), else unknown
  if (intents.length === 0) {
    const domain = resolveDomain(normalized)
    if (domain) {
      return {
        intent: "query_domain",
        confidence: "medium",
        entities: { ...extractEntities(normalized), domain: domain.key },
      }
    }
    return {
      intent: "unknown",
      confidence: "low",
      entities: extractEntities(normalized),
    }
  }

  // Return the highest-confidence intent
  return {
    intent: intents[0].intent,
    confidence: intents[0].confidence,
    entities: extractEntities(normalized),
  }
}

/**
 * Extract entities from normalized text.
 */
export function extractEntities(text: string): ParsedEntities {
  const period = extractPeriod(text)
  return {
    amount: extractAmount(text),
    date: extractDate(text),
    month: period.month,
    year: period.year,
    // Category and vendor extraction will be handled by the entity extractor
  }
}
