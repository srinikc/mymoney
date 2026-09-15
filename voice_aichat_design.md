# Voice Assistant & AI Chat — Design Document

## Voice Assistant Architecture

```
┌─────────────────────────────────────────────────────┐
│                    USER SPEAKS                       │
│  "Spent 250 on groceries at Big Bazaar today"       │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   STT (Speech-to-Text)    │
         │  Web: SpeechRecognition   │
         │  Mobile: expo-speech-rec  │
         │  Runs ON DEVICE — no      │
         │  audio leaves the phone   │
         └─────────────┬─────────────┘
                       │ transcript text
         ┌─────────────▼─────────────┐
         │   POST /api/voice         │
         │  { text, language, page } │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   INTENT CLASSIFIER       │
         │  1. LLM (if API key set)  │
         │  2. Regex fallback (free) │
         └─────────────┬─────────────┘
                       │ VoiceResult
                       │ { intent, entity, answer }
         ┌─────────────▼─────────────┐
         │   CONFIRM & EXECUTE       │
         │  User reviews parsed data │
         │  Taps "Confirm & Save"    │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   EXISTING APIs           │
         │  POST /api/expenses       │
         │  POST /api/income/sources │
         │  POST /api/budgets        │
         └───────────────────────────┘
```

## Voice — Supported Intents

| Intent | Example Phrases | What Happens |
|---|---|---|
| `add_expense` | "Spent 250 on groceries", "Paid 1200 for electricity", "Bought shoes for 3500 via UPI" | Creates expense row |
| `add_income` | "Received 50000 salary", "Got 2000 interest", "Bonus 10000 credited" | Creates income source |
| `set_budget` | "Set budget 5000 for groceries", "Monthly limit 8000 for dining" | Creates budget entry |
| `query` | "How much did I spend on food?", "What's my net worth?", "Show budget summary" | Returns text answer |
| `unknown` | Gibberish, unclear intent | "I didn't understand" response |

## Voice — Entity Extraction

The voice parser extracts these fields from speech:

| Entity | Example | Maps To |
|---|---|---|
| `amount` | 250, 2.5k, 1 lakh | `expense.amount`, `income.amount`, `budget.amount` |
| `category` | groceries, dining, rent | `expense.categoryName`, `budget.category` |
| `vendor` | Big Bazaar, Swiggy, Zomato | `expense.vendor` |
| `date` | today, yesterday, 2026-09-01 | `expense.date` |
| `paymentMode` | UPI, cash, card, bank transfer | `expense.paymentMode` |
| `recurring` | every month, monthly, recurring | `expense.repeat` |
| `incomeType` | monthly, yearly, one-time | `income.type` |

## Voice — Language Support (12 languages)

| Code | Language | STT Provider |
|---|---|---|
| `en-IN` | English | Google/Siri |
| `hi-IN` | Hindi | Google/Siri |
| `kn-IN` | Kannada | Google/Siri |
| `ta-IN` | Tamil | Google/Siri |
| `te-IN` | Telugu | Google/Siri |
| `bn-IN` | Bengali | Google/Siri |
| `mr-IN` | Marathi | Google/Siri |
| `ur-IN` | Urdu | Google/Siri |
| `ml-IN` | Malayalam | Google/Siri |
| `gu-IN` | Gujarati | Google/Siri |
| `pa-IN` | Punjabi | Google/Siri |
| `or-IN` | Odia | Google/Siri |

## Voice — Confidence Levels

| Level | Meaning |
|---|---|
| `high` | LLM matched intent + all entities extracted |
| `medium` | Regex matched or LLM partial match |
| `low` | Uncertain, may need user correction |

## Voice — Page-Aware Hints

The voice API receives the current page path and uses it as a **soft hint** (not a hard rule):
- User on `/expenses` → more likely an expense
- User on `/budgets` → more likely a budget command
- User on `/` (dashboard) → ambiguous, rely on words

## Voice — Technology Stack

| Layer | Technology |
|---|---|
| **STT (Web)** | **Web Speech API** (`SpeechRecognition`) — browser-native, free |
| **STT (Mobile)** | **expo-speech-recognition** v57 — device-native (Google on Android, Siri on iOS) |
| **Intent Parsing** | **LLM** (OpenAI/Anthropic/OpenCode via `queryLLM()`) + **regex fallback** (English pattern matching) |
| **TTS (Web)** | **`speechSynthesis`** — browser-native, free |
| **Backend** | **POST /api/voice** route (Next.js API) — auth, language validation, feature gate |
| **Types** | **Shared** `src/shared/voice.ts` — 12 Indian languages, intent/entity types |
| **UI (Web)** | **FloatingVoice** component — FAB + AnimatePresence dialog + language picker + result card |
| **UI (Mobile)** | **VoiceFAB** + **VoiceModal** — same pattern as QuickCaptureModal (bottom sheet) |
| **Feature Flag** | **`voice_input`** in FeatureFlag table (premium tier, enabled by default) |
| **Tests** | **20 unit tests** — JSON parser, regex fallback, prompt builder, language validation |

## Voice — No External AI Services

- STT runs **entirely on-device/in-browser** — no audio sent to server
- Only the **text transcript** goes to `/api/voice`
- LLM costs only when user asks a question (not for every voice command)
- Regex fallback works **without any LLM key** (English only)

---

## AI Chat Architecture

```
┌─────────────────────────────────────────────────────┐
│                    USER TYPES                        │
│  "How much did I spend on food last month?"         │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   FloatingChat component  │
         │  (text input + send btn)  │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   POST /api/chat          │
         │  { message }              │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   CONTEXT ASSEMBLY        │
         │  1. Auth check (getAuth)  │
         │  2. Load user profile     │
         │  3. Fetch recent data:    │
         │     - Expenses (last 30)  │
         │     - Income sources      │
         │     - Budgets             │
         │     - Goals               │
         │     - Net worth           │
         │     - Health score        │
         │  4. Build financial prompt│
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   RESPONSE GENERATION     │
         │  1. LLM (if API key)      │
         │  2. Local rules (fallback)│
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   RESPONSE FORMATTING     │
         │  - Indian currency format │
         │  - Strip markdown (TTS)   │
         │  - Source tagging (llm/   │
         │    local)                 │
         └───────────────────────────┘
```

## Chat vs Voice — Key Differences

| Aspect | AI Chat | Voice Assistant |
|---|---|---|
| **Input** | Typed text only | Spoken speech → text |
| **Output** | Text answer only | Text answer + optional TTS read-aloud |
| **Intent** | Always `query` (question) | `add_expense`, `add_income`, `set_budget`, `query`, `unknown` |
| **Action** | Answers questions | Answers questions + **creates entries** |
| **Context** | Fetches recent data for rich answers | Uses regex/LLM for entity extraction |
| **Streaming** | Simulated word-by-word display | None (single response) |
| **Templates** | Pre-built query templates shown | Mic button + language picker |
| **History** | Session-based (sessionStorage) | Stateless (each command independent) |
| **UI** | Chat bubble panel (bottom-right) | Voice panel with mic + result card |
| **Cost** | LLM call per message | LLM call only if regex fails |
| **Offline** | Local rules fallback | Regex fallback (English only) |

## Chat — Flow Detail

```
User types → POST /api/chat →
  ├─ Auth check (JWT/cookie)
  ├─ Fetch user's financial data (expenses, income, budgets, goals, net worth)
  ├─ Build prompt with data context
  ├─ Call LLM (OpenAI/Anthropic/OpenCode)
  │   OR use local rule engine (if no LLM key)
  ├─ Format response (Indian currency, strip markdown)
  └─ Return { response, source: "llm" | "local" }
```

## Chat — Fallback Chain

```
LLM available?
  ├─ YES → queryLLM(prompt) → formatted response
  └─ NO → detectIntent(message)
           ├─ "expense summary" → fetch expenses, summarize
           ├─ "budget status" → fetch budgets, compare
           ├─ "net worth" → fetch assets - liabilities
           ├─ "savings rate" → calculate from income/expenses
           └─ "unknown" → "Add an LLM key for richer answers"
```

## Chat — Technology Stack

| Layer | Technology |
|---|---|
| **UI** | `FloatingChat` component (bottom-right FAB + panel) |
| **API** | `POST /api/chat` route |
| **Context** | Assembles user's financial data into prompt |
| **LLM** | OpenAI / Anthropic / OpenCode (configurable) |
| **Fallback** | Local rule engine (regex intent + data queries) |
| **Display** | Simulated streaming (word-by-word) |
| **Storage** | sessionStorage (client-side chat history) |
| **Templates** | Pre-built query suggestions grouped by category |

---

## Where Each Feature Lives

| Feature | Web Component | Mobile Component |
|---|---|---|
| Chat | `FloatingChat` (layout.tsx) | Not implemented yet |
| Voice | `FloatingVoice` (layout.tsx) | `VoiceFAB` + `VoiceModal` (_layout.tsx) |
| Quick capture | N/A | `QuickCaptureModal` (dashboard) |
| Both FABs | z-50, bottom-right, stacked | z-100, bottom-right, stacked |

## Z-Index Stack (Web)

| z-index | Component |
|---|---|
| z-30 | Sticky ad banner, mobile sidebar backdrop |
| z-40 | Ad slots, HelpButton FAB, sidebar |
| z-50 | **FloatingChat** (chat FAB + panel) |
| z-50 | **FloatingVoice** (voice FAB + panel) |
| z-50 | Dialog overlay/content, cookie consent |

## Z-Index Stack (Mobile)

| z-index | Component |
|---|---|
| z-100 | HelpButton FAB |
| z-100 | **VoiceFAB** |
| z-100 | VoiceModal (bottom sheet) |

## API Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/voice` | POST | Parse voice transcript → intent + entities |
| `/api/chat` | POST | AI chat with financial context |
| `/api/expenses` | POST | Create expense (voice confirm) |
| `/api/income/sources` | POST | Create income (voice confirm) |
| `/api/budgets` | POST | Create budget (voice confirm) |
| `/api/budgets` | GET | Fetch categories (budget resolution) |
| `/api/health` | GET | Health check |
