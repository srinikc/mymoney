# MyMoney --- Integrated Text + Voice AI Architecture

## Implementation and Orchestration Design

**Status:** Target architecture for implementation\
**Scope:** Unified MyMoney AI Assistant across text chat and voice\
**Primary goal:** Make text and voice two interaction modalities of the
same assistant, with shared conversation state, page context,
capabilities, financial tools, safety/confirmation rules, and
model-provider abstraction.

------------------------------------------------------------------------

## 1. Executive Decision

MyMoney must not maintain separate "AI Chat intelligence" and "Voice
intelligence".

There is one:

> **MyMoney Assistant**

Text and voice are only input/output modalities.

``` text
                         MYMONEY ASSISTANT
                                |
             +------------------+------------------+
             |                                     |
          TEXT MODE                             VOICE MODE
             |                                     |
       typed messages                       microphone/audio
             |                                     |
             +------------------+------------------+
                                |
                    Conversation Orchestrator
                                |
        +-----------------------+------------------------+
        |                       |                        |
   Conversation            Page Context            Capability
      State                   Resolver                Registry
        |                       |                        |
        +-----------------------+------------------------+
                                |
                       MyMoney AI Agent
                                |
              +-----------------+------------------+
              |                 |                  |
          Read Tools        Write Tools       Analytics
              |                 |                  |
              +-----------------+------------------+
                                |
                         MyMoney APIs / DB
```

The model provider must never become the application architecture. The
provider/model is replaceable underneath the MyMoney Agent.

------------------------------------------------------------------------

# 2. Design Principles

1.  **One assistant, two modalities.**
2.  **One conversation state** shared by text and voice.
3.  **Voice is not a separate intent system.**
4.  **Page context is structured context, not merely a route string.**
5.  **Capabilities and suggested prompts come from the same registry.**
6.  **All financial data access goes through MyMoney tools/services.**
7.  **The LLM never writes directly to the database.**
8.  **Writes are validated and authorized by the backend.**
9.  **Financially sensitive writes use confirmation policies.**
10. **Free mode must work with no LLM.**
11. **Standard mode uses economical external models.**
12. **Premium mode can use native realtime voice models.**
13. **Model/provider selection is configuration, not business logic.**
14. **The system must degrade gracefully when a provider fails.**
15. **Never expose internal model confidence as "low confidence" UX. Ask
    a natural clarification instead.**
16. **The same request should produce equivalent results regardless of
    text or voice.**

------------------------------------------------------------------------

# 3. Target User Experience

The user should see one assistant entry point.

For example:

``` text
                    MyMoney Assistant
                         [ ● ]
```

The assistant opens into a unified conversation.

The user can:

``` text
User: "How much did I spend on food last month?"

Assistant: "You spent ₹8,420 on food last month."

User: "What about dining specifically?"

Assistant: "Dining accounted for ₹3,150."

User: [speaks]
       "And which budget am I closest to exceeding?"

Assistant: "Your dining budget is closest. You've used 87% of it."

User: "Actually increase that budget to 6,000."

Assistant: "Your dining budget is currently ₹5,000. Should I increase it to ₹6,000?"

User: "Yes."

Assistant executes the approved change.
```

No new chat needs to be started when switching from text to voice.

No "Start Listening → Stop Listening → Review → Submit" loop should be
required for ordinary conversation.

------------------------------------------------------------------------

# 4. High-Level Architecture

``` text
Frontend
------------------------------------------------------------
Unified Assistant UI
  |
  +-- Text input
  |
  +-- Voice input/output
  |
  +-- Conversation transcript
  |
  +-- Suggestions
  |
  +-- Confirmation UI
  |
  +-- Current PageContext
  |
  v
Assistant Session API / Realtime Session
------------------------------------------------------------
  |
  v
Conversation Orchestrator
------------------------------------------------------------
  |
  +-- Session manager
  +-- Conversation history
  +-- PageContext
  +-- Capability resolver
  +-- User/profile context
  +-- Model routing
  +-- Confirmation policy
  +-- Tool execution
  +-- Response formatting
  |
  v
MyMoney Agent
------------------------------------------------------------
  |
  +-- Deterministic intent/parser
  +-- LLM reasoning (optional)
  +-- Financial analytics
  +-- Tool selection
  +-- Clarification
  +-- Response generation
  |
  v
Financial Tool Layer
------------------------------------------------------------
  |
  +-- Expenses
  +-- Income
  +-- Budgets
  +-- Goals
  +-- Net worth
  +-- Investments
  +-- Reports
  +-- Insights
  |
  v
Existing MyMoney APIs / database
```

------------------------------------------------------------------------

# 5. Voice Transport and Realtime Layer

Use an open-source realtime transport/orchestration layer such as
**LiveKit**.

LiveKit Agents supports realtime voice/text agents, STT-LLM-TTS
pipelines, realtime providers, tools, turn detection, interruptions, and
self-hosting. The framework is Apache 2.0 and can run on MyMoney
infrastructure.

Recommended architecture:

``` text
Browser / Mobile
      |
      | WebRTC
      v
LiveKit Server
      |
      v
MyMoney Voice Agent
      |
      +-- STT
      +-- MyMoney Agent
      +-- LLM (optional)
      +-- TTS
      +-- Tools
```

Self-host LiveKit where appropriate so the realtime transport does not
force MyMoney into a proprietary AI provider.

LiveKit's AgentSession is designed to orchestrate the realtime session,
input collection, AI pipeline, tools, and output delivery. It also
supports turn detection and interruption handling.

Do not make LiveKit the business-logic layer. It is the realtime
transport/orchestration layer.

------------------------------------------------------------------------

# 6. Voice Conversation Behavior

The voice system must support:

-   automatic speech start detection
-   automatic end-of-turn detection
-   streaming transcription
-   streaming response
-   streaming TTS/audio
-   barge-in/interruption
-   cancellation of current response
-   continuation after interruption
-   conversation history
-   clarification
-   corrections
-   tool execution
-   confirmation
-   failure recovery

Example:

``` text
User: "Show me my spending..."

Assistant begins preparing response.

User: "Actually, I mean last month."

Assistant stops current response.

Conversation state:
  original request = spending
  corrected period = last month

Assistant answers the corrected request.
```

Do not require explicit Stop/Start controls for normal conversational
use.

A microphone button may still exist as a manual fallback.

LiveKit supports VAD/turn detection, endpointing and interruption
handling specifically for this type of interaction.

------------------------------------------------------------------------

# 7. Voice Pipeline Options

The system must support three voice architectures.

## 7.1 Native Realtime

``` text
Audio
  |
  v
Native Realtime Model
  |
  +-- reasoning
  +-- audio input
  +-- audio output
  +-- tool calls
  |
  v
MyMoney Tools
```

Examples can include compatible OpenAI Realtime, Gemini Live, Amazon
Nova Sonic and other realtime providers.

Use this for Premium mode where supported.

------------------------------------------------------------------------

## 7.2 Modular STT → Agent/LLM → TTS

``` text
Audio
  |
  v
STT
  |
  v
Transcript
  |
  v
MyMoney Agent
  |
  +-- deterministic engine
  +-- LLM (optional)
  +-- tools
  |
  v
Text response
  |
  v
TTS
  |
  v
Audio
```

This is the preferred Standard architecture because STT, reasoning model
and TTS can be selected independently.

------------------------------------------------------------------------

## 7.3 No-LLM Free Mode

``` text
Audio
  |
  v
VAD / turn detection
  |
  v
STT
  |
  v
MyMoney Deterministic Agent
  |
  +-- normalization
  +-- entity extraction
  +-- command grammar
  +-- page context
  +-- capability router
  +-- deterministic analytics
  +-- MyMoney tools
  |
  v
Response templates
  |
  v
TTS
```

There is no LLM in this mode.

This can still provide a conversational interaction model, but it cannot
provide unrestricted general reasoning comparable to ChatGPT/Gemini.

------------------------------------------------------------------------

# 8. Free Mode --- No LLM

Free mode should not be implemented as "regex only".

Use a deterministic pipeline:

``` text
Speech
  |
STT
  |
Text normalizer
  |
Entity extractor
  |
Intent / command grammar
  |
PageContext resolver
  |
Capability resolver
  |
Financial tool
  |
Deterministic analytics
  |
Response template
  |
TTS
```

The deterministic engine should support:

### Commands

-   add expense
-   edit expense
-   delete expense
-   add income
-   edit income
-   set budget
-   update budget
-   create goal
-   common queries

### Queries

-   expense totals
-   category spending
-   merchant spending
-   monthly spending
-   budget status
-   budget remaining
-   closest budget to limit
-   goal progress
-   savings rate
-   net worth
-   income summary
-   common investment summaries where structured data exists

### Natural-language normalization

Examples:

``` text
"spent fifty on fruits"
"paid 50 for fruits"
"₹50 for fruits"
"put 50 rupees into fruits"
```

should normalize to the same structured request.

Likewise:

``` text
"chowdeshwari fruits"
"chowdeshwari fruit"
"Chowdeshwari Fruit Shop"
```

should use merchant matching/fuzzy matching where safe.

------------------------------------------------------------------------

# 9. Whisper / STT Layer

Whisper is speech recognition, not an LLM.

Its role is:

``` text
Speech -> Text
```

Possible implementations:

-   browser/device STT
-   Whisper
-   faster-whisper
-   whisper.cpp
-   provider STT APIs
-   other compatible open-source STT engines

`faster-whisper` and `whisper.cpp` are implementations/runtimes for
running Whisper efficiently; they do not replace the MyMoney reasoning
engine.

STT must be abstracted:

``` ts
interface STTProvider {
  transcribe(stream: AudioStream): AsyncIterable<TranscriptEvent>
  getCapabilities(): STTCapabilities
}
```

Capabilities should include:

``` ts
{
  languages: string[],
  streaming: boolean,
  wordTimestamps: boolean,
  diarization: boolean,
  local: boolean
}
```

Do not couple the MyMoney Agent to Whisper-specific APIs.

------------------------------------------------------------------------

# 10. VAD and Turn Detection

Voice Activity Detection determines whether speech is occurring.

Turn detection determines whether the user has finished a thought.

These are separate concerns.

``` text
Microphone
   |
   v
VAD
   |
   +-- speech started
   |
   +-- speech continuing
   |
   +-- speech ended
          |
          v
     Turn detector
          |
          v
       Agent reply
```

Use semantic turn detection where supported.

Use VAD-only mode as a fallback.

The system should support:

-   configurable endpoint delay
-   interruption detection
-   false interruption recovery
-   noise cancellation
-   adaptive interruption where available
-   manual interrupt fallback

------------------------------------------------------------------------

# 11. Unified Conversation State

Do not store voice conversations as stateless commands.

Create a unified conversation/session model.

Suggested structure:

``` ts
interface AssistantConversation {
  id: string
  userId: string

  channel: "text" | "voice" | "mixed"

  messages: AssistantMessage[]

  currentPageContext?: PageContext

  pendingAction?: PendingAction

  createdAt: string
  updatedAt: string
}
```

Messages:

``` ts
interface AssistantMessage {
  id: string
  role: "user" | "assistant" | "tool"
  modality: "text" | "voice"
  text?: string
  audioRef?: string

  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]

  timestamp: string
}
```

The same conversation ID must survive switching:

``` text
text -> voice -> text -> voice
```

------------------------------------------------------------------------

# 12. PageContext

The current page must be promoted from a soft `page` string into
structured context.

``` ts
interface PageContext {
  route: string
  pageId: string
  section?: string

  selectedPeriod?: {
    start: string
    end: string
    label?: string
  }

  selectedCategory?: string
  selectedAccount?: string
  selectedItemId?: string

  capabilities: string[]

  suggestedPrompts: SuggestedPrompt[]
}
```

Example:

``` json
{
  "route": "/budgets",
  "pageId": "budgets",
  "selectedPeriod": {
    "start": "2026-09-01",
    "end": "2026-09-30",
    "label": "This month"
  },
  "capabilities": [
    "budget_status",
    "budget_remaining",
    "budget_forecast",
    "closest_budget_to_limit",
    "create_budget",
    "update_budget"
  ]
}
```

Then:

> "Which one am I closest to exceeding?"

is resolved through the page's capability registry.

The page must not hard-code special voice phrases.

------------------------------------------------------------------------

# 13. Capability Registry

Suggested questions must become capability metadata.

Example:

``` ts
interface CapabilityDefinition {
  id: string
  domain:
    | "spending"
    | "budgets"
    | "goals"
    | "insights"
    | "net_worth"
    | "investments"

  description: string

  supportedModes: {
    free: boolean
    standard: boolean
    premium: boolean
  }

  requiredTools: string[]

  suggestedPrompts: SuggestedPrompt[]
}
```

Example:

``` json
{
  "id": "closest_budget_to_limit",
  "domain": "budgets",
  "description": "Find the budget with the highest utilization percentage",
  "requiredTools": ["get_budget_status"],
  "suggestedPrompts": [
    "Which budget am I closest to exceeding?",
    "Which budget is almost full?"
  ]
}
```

The same capability is available to:

-   text
-   voice
-   free mode
-   standard mode
-   premium mode

Only the reasoning mechanism changes.

------------------------------------------------------------------------

# 14. Suggested Prompts

Existing prompts should be migrated into the Capability Registry.

### Spending

-   What's my top spending category?
-   Show me my dining expenses.

### Budgets

-   Am I over any budget this month?
-   How much budget do I have left?
-   Which budget am I closest to exceeding?

### Goals

-   How is my emergency fund goal progressing?
-   When will I reach my savings goal?
-   Am I saving enough each month?

### Insights

-   Suggest ways to save money.
-   Where can I cut expenses?
-   Is my spending healthy?

### Net Worth

-   What's my current net worth?
-   How has my net worth changed?
-   What are my biggest assets?

### Investments

-   How are my investments performing?
-   Should I invest more?
-   What's a good investment strategy?

The UI can display these suggestions, but they must also be available to
the voice/text capability resolver.

------------------------------------------------------------------------

# 15. MyMoney Tool Layer

The assistant must interact with the application through tools.

Suggested read tools:

``` text
get_expenses
search_expenses
get_spending_summary
get_category_spending
get_merchant_spending

get_income
get_income_summary

get_budgets
get_budget_status
get_budget_forecast

get_goals
get_goal_progress

get_net_worth
get_assets
get_liabilities

get_investment_summary
get_portfolio_performance

get_financial_insights
```

Suggested write tools:

``` text
create_expense
update_expense
delete_expense

create_income
update_income
delete_income

create_budget
update_budget
delete_budget

create_goal
update_goal
delete_goal
```

The exact tool set should map onto the existing MyMoney APIs.

------------------------------------------------------------------------

# 16. Tool Security Boundary

The LLM must never directly access the database.

Correct:

``` text
LLM
 |
 | tool call
 v
MyMoney Tool Layer
 |
 | authenticate
 | authorize
 | validate
 | business rules
 | confirmation policy
 |
 v
Existing API/service
 |
 v
Database
```

Incorrect:

``` text
LLM -> database
```

Every tool call must receive the authenticated user identity from the
server-side session, not from model-generated arguments.

Never trust:

``` json
{
  "userId": "..."
}
```

from the model.

------------------------------------------------------------------------

# 17. Confirmation Policy

Reads:

``` text
No confirmation
```

Normal creates:

``` text
Configurable confirmation
```

Example:

> "Add ₹50 for fruits at Chowdeshwari Fruit."

Assistant:

> "I'll add ₹50 for fruits at Chowdeshwari Fruit. Shall I save it?"

After the user establishes trust, low-risk creates can optionally use
automatic execution.

Budget modifications:

``` text
Always confirm initially.
```

Deletes:

``` text
Always confirm.
```

Transfers or financially consequential operations:

``` text
Always confirm.
```

The confirmation system must work identically for text and voice.

------------------------------------------------------------------------

# 18. Pending Action State

When confirmation is required:

``` ts
interface PendingAction {
  id: string
  tool: string
  arguments: Record<string, unknown>

  riskLevel: "low" | "medium" | "high"

  confirmationRequired: boolean

  expiresAt?: string
}
```

Voice:

> "Should I save that?"

User:

> "Yes."

The system executes the exact pending action.

Do not ask the LLM to reconstruct the action from scratch after
confirmation.

------------------------------------------------------------------------

# 19. Clarification Instead of Confidence UI

Do not expose:

``` text
Confidence: LOW
Intent: UNKNOWN
```

Instead:

``` text
User:
"Add 50 rupees for fruit from chowdeshwari fruit."

Assistant:
"Sure. Was Chowdeshwari Fruit the shop, and should I categorize this as Fruits?"
```

The assistant should identify only the missing/ambiguous information.

Use confidence internally for routing if useful:

``` text
high
medium
low
```

but never make the user understand the internal classifier.

------------------------------------------------------------------------

# 20. Model Abstraction

Create a provider-independent AI abstraction.

``` ts
interface AIProvider {
  id: string
  getModels(): Promise<ModelDefinition[]>
}

interface LLMProvider extends AIProvider {
  generate(request: LLMRequest): AsyncIterable<LLMEvent>
}

interface RealtimeVoiceProvider extends AIProvider {
  createSession(request: RealtimeSessionRequest): Promise<RealtimeSession>
}

interface STTProvider extends AIProvider {
  transcribe(stream: AudioStream): AsyncIterable<TranscriptEvent>
}

interface TTSProvider extends AIProvider {
  synthesize(text: string): AsyncIterable<AudioChunk>
}
```

MyMoney Agent must depend on these interfaces, never on
OpenAI/Google/OpenRouter SDKs directly.

------------------------------------------------------------------------

# 21. Model Capability Registry

Do not classify a model as "voice" merely because it comes from a
voice-capable provider.

Store explicit capabilities:

``` ts
interface ModelCapability {
  provider: string
  model: string

  textInput: boolean
  textOutput: boolean

  audioInput: boolean
  audioOutput: boolean

  realtime: boolean
  streaming: boolean

  toolCalling: boolean

  contextWindow?: number

  languages?: string[]

  pricing?: PricingInfo

  freeTier?: boolean

  source:
    | "provider"
    | "openrouter"
    | "opencode"
    | "local"
    | "browser"
}
```

The registry should be refreshed from provider/model metadata where
possible.

------------------------------------------------------------------------

# 22. LLM Model Settings

Existing LLM Model Settings remains the place for text reasoning models.

It may contain:

``` text
Provider
Model
API key / connection
Temperature / reasoning configuration
Context settings
Default model
Fallback model
```

Models available through OpenCode Zen, OpenCode Go, OpenRouter and other
providers can appear here when configured.

These models should not automatically appear in Voice Model Settings
unless their capabilities explicitly support audio.

------------------------------------------------------------------------

# 23. Voice Model Settings

Add a separate Settings section:

``` text
Settings
 |
 +-- LLM Model Settings
 |
 +-- Voice Model Settings
```

Voice Model Settings should support:

``` text
Voice Architecture

( ) Auto
( ) Native Realtime
( ) STT → LLM → TTS
( ) No-LLM / Free
( ) Browser / Device Fallback
```

For modular voice:

``` text
STT Provider
STT Model

Reasoning Provider
Reasoning Model

TTS Provider
TTS Model
```

For native realtime:

``` text
Realtime Provider
Realtime Model
Voice
```

------------------------------------------------------------------------

# 24. Voice Model Categories

Voice Model Settings should have separate sections:

## Native Realtime

Models/providers supporting realtime speech-to-speech.

## Audio-capable LLM

Models supporting audio input/output but not necessarily full realtime
sessions.

## Speech-to-Text

Examples may include:

-   Whisper
-   faster-whisper deployments
-   Qwen ASR
-   Parakeet
-   provider STT APIs

## Text-to-Speech

Examples may include:

-   Kokoro
-   Fish Audio
-   Deepgram
-   Gemini TTS
-   OpenAI TTS
-   other compatible providers

Do not show text-only models such as a normal OpenCode LLM as a voice
model.

OpenRouter currently supports multimodal audio models plus dedicated STT
and TTS endpoints, so it can populate the registry where model
capabilities match.

------------------------------------------------------------------------

# 25. OpenCode / OpenCode Zen / OpenCode Go

Treat these as **model access sources**, not voice architectures.

A model obtained through:

-   OpenCode Zen Free
-   OpenCode Zen
-   OpenCode Go

should be added to the LLM registry according to the actual model
capabilities.

If a model has:

``` text
text input = true
text output = true
audio input = false
audio output = false
```

it belongs only to LLM Model Settings.

If a future model exposed through one of these services supports audio,
it can also appear in Voice Model Settings after capability discovery.

Never assume voice capability from the provider name.

------------------------------------------------------------------------

# 26. OpenRouter

OpenRouter should be treated similarly.

It is a model routing/provider abstraction, not a single voice model.

Its capability discovery should determine whether a model supports:

-   text
-   audio input
-   audio output
-   STT
-   TTS
-   streaming
-   tools
-   realtime where applicable

Use dedicated STT/TTS endpoints where they are more appropriate than
sending speech through a general multimodal LLM.

------------------------------------------------------------------------

# 27. Four MyMoney AI Experience Modes

## Mode 1 --- FREE

``` text
Realtime transport:
  Open-source/self-hosted

STT:
  Browser/device STT or self-hosted/open-source STT

Reasoning:
  MyMoney deterministic engine

TTS:
  Browser/device or open-source TTS

LLM:
  NONE
```

Capabilities:

-   common commands
-   structured financial queries
-   page-aware queries
-   deterministic analytics
-   confirmations
-   corrections
-   conversational session
-   voice interruption mechanics where the transport supports them

Limitation:

-   no unrestricted general reasoning

------------------------------------------------------------------------

## Mode 2 --- FALLBACK

Used when the preferred voice stack is unavailable.

``` text
Browser/device STT
      |
      v
MyMoney API
      |
      v
Deterministic Agent
      |
      v
Browser/device TTS
```

This preserves the current application's existing voice capability.

It should not be treated as the primary architecture.

------------------------------------------------------------------------

## Mode 3 --- STANDARD

``` text
LiveKit / open-source realtime
      |
      +-- economical STT
      |
      +-- economical LLM
      |
      +-- economical TTS
```

Potential model sources:

-   OpenRouter
-   OpenCode/Zen/Go where the model is appropriate for text reasoning
-   other lower-cost providers

The system must select only models compatible with the required
modality.

------------------------------------------------------------------------

## Mode 4 --- PREMIUM

``` text
LiveKit / realtime infrastructure
      |
      v
Native realtime voice model
      |
      v
MyMoney Agent + Tools
```

Potential providers include compatible premium realtime offerings from:

-   OpenAI
-   Google
-   AWS
-   other supported realtime providers

The exact available models must be discovered from the provider/model
registry rather than hard-coded permanently.

------------------------------------------------------------------------

# 28. Auto Routing

The user should be able to select:

``` text
Experience: AUTO
```

The router chooses:

``` text
1. Premium configured model
2. Standard configured model
3. Free deterministic engine
4. Browser/device fallback
```

subject to:

``` text
capability
availability
user configuration
provider health
cost policy
language support
tool support
latency
```

Example:

``` text
Need:
  voice input
  voice output
  tool calling
  Kannada
  realtime

Router checks candidates.

Candidate A:
  realtime ✓
  Kannada ✓
  tools ✓
  available ✓

Candidate B:
  audio input ✓
  audio output ✓
  realtime ✗

Choose A.
```

------------------------------------------------------------------------

# 29. Provider Failure Handling

Never expose raw provider errors.

Use:

``` text
Provider failure
      |
      v
retry if safe
      |
      v
alternate provider
      |
      v
deterministic mode
      |
      v
browser/device fallback
```

For an in-progress conversation, preserve:

-   conversation ID
-   messages
-   pending action
-   PageContext
-   tool state

A provider switch must not reset the conversation.

------------------------------------------------------------------------

# 30. Text and Voice API Design

Replace separate intelligence endpoints with a common assistant
protocol.

Possible:

``` http
POST /api/assistant/message
```

Request:

``` json
{
  "conversationId": "...",
  "modality": "text",
  "message": "Which budget am I closest to exceeding?",
  "pageContext": {
    "pageId": "budgets",
    "route": "/budgets",
    "selectedPeriod": {
      "start": "2026-09-01",
      "end": "2026-09-30"
    }
  }
}
```

Voice can use a realtime session rather than posting every utterance:

``` http
POST /api/assistant/session
```

The realtime agent then sends events.

------------------------------------------------------------------------

# 31. Assistant Event Protocol

Use a common event model:

``` ts
type AssistantEvent =
  | { type: "user_transcript"; text: string }
  | { type: "assistant_text_delta"; text: string }
  | { type: "assistant_audio"; chunk: Uint8Array }
  | { type: "tool_call"; call: ToolCall }
  | { type: "tool_result"; result: ToolResult }
  | { type: "confirmation_required"; action: PendingAction }
  | { type: "action_completed"; result: unknown }
  | { type: "clarification_required"; question: string }
  | { type: "interrupted" }
  | { type: "error"; code: string };
```

This lets the UI render text and voice consistently.

------------------------------------------------------------------------

# 32. Conversation Orchestrator

The central orchestration sequence should be:

``` text
1. Receive text or speech event
2. Authenticate user
3. Resolve conversation
4. Resolve current PageContext
5. Normalize input
6. Determine available capabilities
7. Determine whether deterministic handling is sufficient
8. If yes -> deterministic engine
9. Otherwise -> selected LLM/realtime model
10. Provide tools/capabilities
11. Execute read tools
12. Request confirmation when required
13. Execute approved writes
14. Generate response
15. Stream response
16. Persist conversation event
17. Update session state
```

The model is only one component in step 9.

------------------------------------------------------------------------

# 33. Deterministic vs LLM Routing

Use a hybrid decision.

Example:

``` text
"What's my net worth?"
        |
        v
deterministic capability
        |
        v
get_net_worth
        |
        v
answer
```

No LLM required.

But:

``` text
"Looking at my spending, goals and investments,
what should I prioritize over the next six months?"
        |
        v
complex reasoning
        |
        v
LLM
```

The system should not spend an LLM call when a deterministic capability
can answer the request reliably.

------------------------------------------------------------------------

# 34. Response Generation

Responses must have two representations:

``` text
Rich response
```

for text UI:

-   formatting
-   tables
-   links
-   numbers
-   charts where appropriate

and:

``` text
Speech response
```

for TTS:

-   concise
-   natural
-   no markdown
-   no raw JSON
-   pronounceable currency
-   avoid excessive lists

Example:

Text:

> Your dining budget is ₹5,000. You've spent ₹4,350, so you're at 87%.

Voice:

> "Your dining budget is at 87 percent. You've spent ₹4,350 out of
> ₹5,000."

------------------------------------------------------------------------

# 35. Financial Data Context

Do not send the entire database to the LLM.

Prefer tools.

Bad:

``` text
Huge prompt containing every expense.
```

Better:

``` text
User question
     |
     v
LLM
     |
     v
get_category_spending({
  category: "food",
  period: "last_month"
})
```

Then the LLM receives the tool result.

This improves:

-   privacy
-   cost
-   context size
-   correctness
-   freshness
-   performance

------------------------------------------------------------------------

# 36. Page Context and Tools Work Together

PageContext tells the assistant what the user is currently looking at.

Tools provide authoritative data.

Example:

``` text
PageContext:
  page = budgets
  period = this month

User:
  "Which one am I closest to exceeding?"
```

Assistant:

``` text
capability = closest_budget_to_limit

tool:
  get_budget_status(period = current_page_period)

calculate:
  highest utilization

response:
  natural answer
```

Page context must never override explicit user instructions.

If user says:

> "Show me last month instead."

the explicit request wins.

------------------------------------------------------------------------

# 37. Conversation Memory

Separate:

### Short-term conversation memory

Current conversation:

``` text
"Show food spending."
"Last month."
"Only dining."
```

### Application state

Financial database.

### Long-term user preferences

Only persist intentionally useful preferences.

Do not use conversation history as a substitute for authoritative
financial data.

------------------------------------------------------------------------

# 38. Observability

Track:

``` text
conversationId
userId
sessionId
modality
provider
model
latency
STT duration
LLM latency
TTS latency
tool calls
tool latency
errors
fallbacks
estimated cost
confirmation events
interruptions
```

Do not store raw audio by default.

If transcripts are persisted, apply the same privacy/security controls
as other financial data.

------------------------------------------------------------------------

# 39. Cost Metering

Create an AI usage record:

``` ts
interface AIUsageRecord {
  userId: string
  conversationId: string

  modality: "text" | "voice"

  provider: string
  model: string

  inputTokens?: number
  outputTokens?: number

  audioInputSeconds?: number
  audioOutputSeconds?: number

  toolCalls: number

  estimatedCost?: number

  createdAt: string
}
```

This allows future:

-   free quotas
-   standard quotas
-   premium quotas
-   cost dashboards
-   provider comparison
-   automatic cost routing

------------------------------------------------------------------------

# 40. Security

Required:

-   server-side authentication
-   server-side authorization
-   per-user data isolation
-   provider API keys never exposed to browser
-   tool arguments validated
-   write operations protected by policy
-   confirmation state server-side
-   rate limiting
-   abuse protection
-   audit logs for financial mutations
-   sensitive transcript/audio retention controls

The voice channel must not become a bypass around the normal financial
API authorization.

------------------------------------------------------------------------

# 41. Frontend Migration

Current architecture has:

``` text
FloatingChat
FloatingVoice
```

Do not maintain two independent assistants.

Replace with:

``` text
MyMoneyAssistant
```

with:

``` text
AssistantPanel
  |
  +-- ConversationView
  |
  +-- TextComposer
  |
  +-- VoiceController
  |
  +-- SuggestionChips
  |
  +-- ConfirmationCard
  |
  +-- ToolResultRenderer
```

A single assistant FAB can expose both text and voice.

------------------------------------------------------------------------

# 42. Mobile Migration

Current:

``` text
VoiceFAB
VoiceModal
```

should become:

``` text
AssistantFAB
AssistantSheet
```

The sheet can switch between:

``` text
Text
Voice
```

without starting a separate conversation.

------------------------------------------------------------------------

# 43. Existing `/api/voice` and `/api/chat`

Do not delete immediately.

Phase them into compatibility adapters.

``` text
/api/chat
      |
      v
Assistant Orchestrator

/api/voice
      |
      v
Assistant Orchestrator
```

Then eventually migrate clients to:

``` text
/api/assistant/*
```

This reduces implementation risk.

------------------------------------------------------------------------

# 44. Suggested Backend Modules

``` text
src/
  ai/
    assistant/
      AssistantOrchestrator
      ConversationManager
      CapabilityRegistry
      PageContextResolver
      ModelRouter
      ConfirmationPolicy
      ResponseFormatter

    providers/
      openai/
      google/
      aws/
      openrouter/
      opencode/
      local/
      browser/

    voice/
      VoiceSessionManager
      STTProvider
      TTSProvider
      RealtimeProvider
      TurnDetection
      InterruptionManager

    deterministic/
      IntentParser
      EntityExtractor
      CommandGrammar
      CapabilityRouter
      FinancialAnalytics
      ResponseTemplates

    tools/
      expenses/
      income/
      budgets/
      goals/
      networth/
      investments/
      insights/

    observability/
      AIUsage
      AIEvents
      Metrics
```

Adapt the exact paths to the existing MyMoney repository conventions.

------------------------------------------------------------------------

# 45. Suggested Shared Types

Create shared contracts for:

``` text
AssistantConversation
AssistantMessage
AssistantEvent
PageContext
CapabilityDefinition
SuggestedPrompt
ToolDefinition
ToolCall
ToolResult
PendingAction
ModelCapability
AIUsageRecord
```

Frontend and backend should use the same types where appropriate.

------------------------------------------------------------------------

# 46. Implementation Phases

## Phase 1 --- Unify the intelligence

1.  Create `AssistantOrchestrator`.
2.  Create shared conversation state.
3.  Create PageContext.
4.  Create Capability Registry.
5.  Move existing chat prompts into capabilities.
6.  Create common financial tools.
7.  Route `/api/chat` through the orchestrator.
8.  Route `/api/voice` through the orchestrator.

At this point text and current voice share intelligence even before
realtime voice is introduced.

------------------------------------------------------------------------

## Phase 2 --- Deterministic Free Agent

Implement:

``` text
Normalizer
EntityExtractor
CommandGrammar
CapabilityRouter
FinancialAnalytics
ResponseTemplates
```

Support the highest-value MyMoney commands and queries.

No LLM required.

------------------------------------------------------------------------

## Phase 3 --- Unified Assistant UI

Replace separate chat/voice experiences with:

``` text
MyMoneyAssistant
```

Maintain one conversation.

Support switching:

``` text
text <-> voice
```

------------------------------------------------------------------------

## Phase 4 --- Realtime Voice

Introduce LiveKit.

Implement:

-   WebRTC
-   voice session
-   VAD
-   turn detection
-   interruptions
-   streaming transcript
-   streaming TTS
-   session lifecycle

Keep the deterministic agent underneath.

------------------------------------------------------------------------

## Phase 5 --- Provider Abstraction

Implement:

``` text
STTProvider
TTSProvider
LLMProvider
RealtimeVoiceProvider
```

Add capability discovery.

------------------------------------------------------------------------

## Phase 6 --- Standard Mode

Add economical providers/models.

Use:

``` text
STT
  +
LLM
  +
TTS
```

Route simple requests to deterministic handling to minimize LLM usage.

------------------------------------------------------------------------

## Phase 7 --- Premium Realtime

Add native realtime providers.

Keep MyMoney tools and safety layer unchanged.

The only thing that changes is the voice/model adapter.

------------------------------------------------------------------------

## Phase 8 --- Settings

Add:

``` text
LLM Model Settings
Voice Model Settings
AI Experience
```

Implement model capability discovery.

------------------------------------------------------------------------

# 47. Testing Strategy

## Deterministic parser tests

Test:

``` text
₹50 fruits
50 rupees for fruits
spent 50 on fruits
paid 50 at shop
```

including multilingual variants.

## Conversation tests

``` text
User: Add ₹50 fruits.
User: Actually ₹80.
```

Expected final pending action:

``` text
amount = 80
```

## Page context tests

``` text
Budgets page
+
"Which one am I closest to exceeding?"
```

must route to:

``` text
closest_budget_to_limit
```

## Confirmation tests

Ensure:

``` text
delete
budget modification
high-risk actions
```

cannot execute without required confirmation.

## Provider fallback tests

Simulate:

``` text
Realtime provider unavailable
STT unavailable
LLM unavailable
TTS unavailable
```

and verify graceful fallback.

## Interruption tests

Verify:

``` text
Assistant speaking
      ↓
User speaks
      ↓
Assistant stops
      ↓
User request processed
```

## Modality equivalence tests

The same semantic request should produce equivalent tool calls whether
received through:

``` text
text
voice transcript
```

------------------------------------------------------------------------

# 48. Acceptance Criteria

The implementation is complete when:

### Unified assistant

-   Text and voice use the same assistant.
-   One conversation survives modality changes.
-   One PageContext is shared.
-   One capability registry is shared.
-   One tool layer is shared.

### Voice

-   No mandatory Start/Stop cycle.
-   Automatic turn detection.
-   User can interrupt assistant.
-   Assistant resumes naturally.
-   Streaming transcript works.
-   Streaming audio works.
-   Corrections work.
-   Clarifications work.

### Free mode

-   No LLM API is called.
-   Common MyMoney queries work.
-   Common MyMoney commands work.
-   Page-aware queries work.
-   Confirmation works.
-   Voice can still operate through supported STT/TTS.
-   No "add an LLM key" message for supported deterministic
    capabilities.

### Standard

-   Economical external models can be selected.
-   STT/LLM/TTS can be independently configured.
-   Simple requests can avoid LLM calls.

### Premium

-   Native realtime voice models can be selected.
-   Tools work through the same MyMoney Agent.
-   Conversation state remains provider-independent.

### Safety

-   LLM cannot directly access DB.
-   Every mutation passes through MyMoney services.
-   Confirmation policies are enforced server-side.
-   User authorization is enforced server-side.

------------------------------------------------------------------------

# 49. Important Architectural Rule

Do **not** implement this:

``` text
TEXT
  -> Chat LLM

VOICE
  -> Voice LLM
```

Implement:

``` text
TEXT ────────────┐
                 |
VOICE ───────────┤
                 v
        MYMONEY ASSISTANT
                 |
        +--------+--------+
        |        |        |
     Context  Capabilities Tools
        |        |        |
        +--------+--------+
                 |
             Model Router
                 |
      +----------+-----------+
      |          |           |
   No LLM     Standard    Premium
```

The model is an implementation detail.

------------------------------------------------------------------------

# 50. Final Target Architecture

``` text
                         USER
                          |
              +-----------+-----------+
              |                       |
            TEXT                    VOICE
              |                       |
              |                    WebRTC
              |                       |
              +-----------+-----------+
                          |
                  MYMONEY ASSISTANT
                          |
                 Conversation Session
                          |
        +-----------------+------------------+
        |                 |                  |
   Page Context      Capabilities       Conversation
        |                 |                  |
        +-----------------+------------------+
                          |
                 Decision / Model Router
                          |
        +-----------------+------------------+
        |                 |                  |
      FREE             STANDARD           PREMIUM
        |                 |                  |
 Deterministic       STT + LLM + TTS    Realtime Voice
    Agent                                  Model
        |                 |                  |
        +-----------------+------------------+
                          |
                    MyMoney Tools
                          |
        +-----------------+------------------+
        |                 |                  |
    Expenses          Budgets            Goals
    Income            Net Worth          Investments
    Analytics         Insights           Reports
                          |
                   Existing APIs
                          |
                       DATABASE
```

## Implementation instruction to the coding LLM

Treat this document as the **target architecture**, not as a request to
rewrite the entire application blindly.

First inspect the existing MyMoney repository and map:

1.  existing chat implementation
2.  existing voice implementation
3.  existing API routes
4.  existing financial services
5.  existing authentication
6.  existing page components
7.  existing model configuration
8.  existing feature flags
9.  existing tests
10. existing shared types

Then produce an implementation plan showing:

-   files to create
-   files to modify
-   files to retire
-   API migration strategy
-   database/schema changes
-   provider integration changes
-   frontend migration
-   test plan

Implement incrementally and preserve existing functionality.

Do not introduce a second financial-data access layer if an existing
service/API already provides the required operation.

Do not expose provider API keys to the client.

Do not allow an LLM to bypass MyMoney authorization or call the database
directly.

Do not hard-code provider/model capability assumptions when provider
metadata can be discovered.

The end result must be **one MyMoney Assistant with text and voice
modalities**, not two separate assistants.
