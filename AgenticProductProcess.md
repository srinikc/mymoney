# Agentic Product Development Process — MyMoney

> **Purpose**: Define how we build MyMoney using an agentic workflow — orchestrator + worker agents, branching strategy, quality gates, and observability.
> **Last updated**: 24-Jun-2026

---

## 1. Development Philosophy

| Principle | Description |
|---|---|
| **Design-first & API-first** | Every module starts with user flow (Gherkin) + API contract. Code follows design, not the reverse. |
| **Branch-per-module** | `main` is always clean and shippable. Work happens on feature branches off `develop`. |
| **One complete vertical slice at a time** | No parallel half-features. Each module is fully built, verified E2E, and merged before the next starts. |
| **Observability first** | The dev-monitor dashboard shows real-time progress before any agentic work begins. |
| **Quality gates before every merge** | TypeScript, lint, scope check, and E2E tests must pass. No broken code reaches `develop` or `main`. |
| **Open-source standards as review criteria** | Every merge is checked against Node.js Best Practices, Project Guidelines, and industry coding standards. |

---

## 2. Git Branching Strategy

```
main       (stable, shippable — merges from develop only)
  ↑
develop    (integration branch — feature branches merge here)
  ↑
feature/P1.1-geist-font    (work happens here)
feature/P1.2-motion-install
feature/P3.1-multiselect
...
```

### Conventions

| Element | Convention |
|---|---|
| **Branch name** | `feature/P<phase>-<kebab-case-name>` |
| **Commit messages** | Imperative mood, subject ≤50 chars, body explains what/why |
| **Merge to develop** | After gate passes + E2E walkthrough + your approval |
| **Merge to main** | When a set of features is stable and tested together |

---

## 3. Module Lifecycle — Every Feature Goes Through This

### Phase A: Product Definition (PM Mode)

```
┌────────────────────────────────────────────────────────────────┐
│  A1: User Flow (Gherkin)                                       │
│  ─────────────────────────────────────────                     │
│  Feature: Multi-select vendor filter                            │
│    Scenario: User filters by two vendors                        │
│      Given I am on the Expenses page                            │
│      When I click the Vendor filter                             │
│      And I check "Big Bazaar" and "D-Mart"                      │
│      Then the table shows only matching expenses                │
│                                                                │
│  A2: API Contract Design                                        │
│  ───────────────────────                                        │
│  GET /api/expenses?vendor=BigBazaar&vendor=D-Mart               │
│  Response: { data: [...], total: 5, ... }                      │
│                                                                │
│  A3: Component Design                                           │
│  ────────────────────                                           │
│  MultiSelect props: { options, selected, onChange, blankOption }│
│  States: loading, empty, partial, all                           │
│                                                                │
│  A4: ✅ You approve the design                                  │
└────────────────────────────────────────────────────────────────┘
```

### Phase B: Implementation (Agent Mode)

```
┌────────────────────────────────────────────────────────────────┐
│  B1: Branch from develop                                        │
│  git checkout develop && git checkout -b feature/P3-multiselect │
│                                                                │
│  B2: Write E2E tests FIRST (they fail = RED)                    │
│  tests/modules/P3-multiselect.spec.ts                           │
│  npx playwright test → ❌ 3 failed (expected)                    │
│                                                                │
│  B3: Agent implements feature                                   │
│  ├── Backend: API route changes                                 │
│  ├── Frontend: MultiSelect component + page integration         │
│  └── Tests now pass = GREEN                                     │
│  npx playwright test → ✅ 3 passed                               │
│                                                                │
│  B4: Agent reports done                                         │
│  Returns: files changed, summary, any issues                    │
└────────────────────────────────────────────────────────────────┘
```

### Phase C: Quality Gate (Review Mode)

```
┌────────────────────────────────────────────────────────────────┐
│  Orchestrator runs these checks before ANY merge:               │
│                                                                │
│  [✅] tsc --noEmit                    (TypeScript strict mode)   │
│  [✅] next lint                       (ESLint w/ Airbnb config) │
│  [✅] npx playwright test             (All E2E tests pass)      │
│  [✅] Scope check                     (Only intended files)     │
│  [✅] No console.log                  (Lint catches this)       │
│  [✅] No `any` types                  (tsc strict catches)      │
│  [✅] Follows Node.js Best Practices  (per section)             │
│  [✅] Follows Project Guidelines      (naming, structure, API)  │
│  [✅] Error states handled            (loading, empty, error)   │
│                                                                │
│  If ANY fails → Agent fixes on same branch → re-run gate       │
└────────────────────────────────────────────────────────────────┘
```

### Phase D: Validation — Walkthrough (Demo Mode)

```
┌────────────────────────────────────────────────────────────────┐
│  Orchestrator starts dev server and walks through EVERY step:  │
│                                                                │
│  [✅] 1. Open page → renders without error                     │
│  [✅] 2. Click Vendor filter → dropdown opens                  │
│  [✅] 3. Check "Big Bazaar" + "D-Mart" → table filters         │
│  [✅] 4. "(Blank)" option present and works                    │
│  [✅] 5. Clear filter → table resets                           │
│  [✅] 6. Empty state → "No matching expenses" shown            │
│  [✅] 7. Mobile responsive → layout adjusts                    │
│  [✅] 8. Dark mode → colors correct                            │
│                                                                │
│  If ANY step fails → back to Phase B (fix)                     │
│  If ALL pass → ready for your approval                         │
└────────────────────────────────────────────────────────────────┘
```

### Phase E: Merge (Release Mode)

```
┌────────────────────────────────────────────────────────────────┐
│  E1: Merge to develop                                           │
│  git checkout develop && git merge feature/P3-multiselect       │
│                                                                │
│  E2: Tag with build number                                      │
│  git tag build-001                                              │
│                                                                │
│  E3: Agent reports to dashboard                                 │
│  progress.json updated + activity.jsonl appended                │
│                                                                │
│  E4: Notify you                                                  │
│  "P3.1 Multi-select filters — ready for your review at /dev-mon│
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Agent Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR (ME)                            │
│                                                                     │
│  • Breaks DESIGN.md phases into discrete tasks                     │
│  • Assigns scope (files + boundaries) to each agent                │
│  • Tracks dependencies — serializes where needed                   │
│  • Runs quality gates before every merge                            │
│  • Walks through user flows before asking for your review           │
│  • Updates progress.json + activity.jsonl after every action        │
└──────┬─────────┬──────────┬──────────┬─────────────────────────────┘
       │         │          │          │
       ▼         ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│ Agent A  │ │ Agent B  │ │ Agent C  │ │ Agent D      │
│ (UI)     │ │ (Auth)   │ │ (AI)     │ │ (Integrate)  │
│          │ │          │ │          │ │              │
│ Font     │ │ Prisma   │ │ Health   │ │ Bank API     │
│ Motion   │ │ NextAuth │ │ Score    │ │ OCR          │
│ Filters  │ │ Profile  │ │ Chatbot  │ │ AA           │
│ Charts   │ │ Admin    │ │ Planner  │ │ Broker       │
└──────────┘ └──────────┘ └──────────┘ └──────────────┘
```

### Agent Rules

| Rule | Detail |
|---|---|
| **Scope isolation** | Each agent is told exactly which files it can and cannot touch |
| **Parallel only on non-conflicting files** | I verify no two agents edit the same file simultaneously |
| **Serial for dependencies** | If B depends on A, B waits until A is merged |
| **Report format** | Agent returns: files changed, summary, any issues encountered |
| **Fail fast** | If agent encounters unexpected error, it stops and reports |

---

## 5. Quality Standards Referenced

| Standard / Resource | Application in Gate |
|---|---|
| **[Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)** (105K ★) | Error handling, code style, project architecture, security |
| **[Project Guidelines](https://github.com/elsewhencode/project-guidelines)** (29.5K ★) | Git workflow, branching, naming, API design, testing |
| **[Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)** (145K ★) | ESLint rules, naming conventions, code structure |
| **[Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)** | Type design, strictness, generics usage |
| **[React Official Docs](https://react.dev)** | Component patterns, hooks, Server Components, error boundaries |
| **[Next.js Official Docs](https://nextjs.org/docs)** | App Router, API routes, data fetching patterns |
| **[RESTful API Design](https://restfulapi.net/)** | Resource naming, status codes, pagination, versioning |
| **[Gherkin / Cucumber](https://cucumber.io/docs/gherkin/reference/)** | User flow format (Given-When-Then) |

---

## 6. Observability — Development Monitor Dashboard

> The dashboard is a **standalone tool** (not part of the MyMoney app) that shows real-time progress of all agentic work.

### Location

```
dev-dashboard/
├── server.js          (Express server on port 3099)
├── public/
│   └── index.html     (Full dashboard UI — 3 panels)
└── data/
    ├── progress.json  (Phase state — maintained by Orchestrator)
    └── activity.jsonl (Activity log — appended after every action)
```

### Start Command

```
node dev-dashboard/server.js
→ Open http://localhost:3099
```

### Data Format

```json
// progress.json
{
  "phases": [
    {
      "id": "P1",
      "name": "UI Excellence",
      "progress": 40,
      "items": [
        { "id": "P1.1", "name": "Geist font", "status": "done",
          "agent": "A1", "date": "24-Jun",
          "scope": ["layout.tsx","tailwind.config.ts","package.json"],
          "gates": { "tsc": "pass", "lint": "pass", "e2e": "skip" } },
        { "id": "P1.2", "name": "Motion install", "status": "done",
          "agent": "A1", "date": "24-Jun",
          "scope": ["package.json","providers.tsx"],
          "gates": { "tsc": "pass", "lint": "pass", "e2e": "skip" } },
        { "id": "P1.3", "name": "Page transitions", "status": "in_progress",
          "agent": "A2" }
      ]
    }
  ],
  "activeAgent": { "id": "A2", "task": "P1.3", "startedAt": "12:00" },
  "lastMerge": { "phase": "P1.2", "time": "11:45", "result": "pass" }
}
```

```jsonl
// activity.jsonl (one JSON object per line)
{"ts":"2026-06-24T12:05:23Z","type":"gate_start","phase":"P1.3","agent":"A2","checks":["tsc","lint"]}
{"ts":"2026-06-24T12:03:10Z","type":"file_write","agent":"A2","file":"src/app/layout.tsx","linesAdded":3,"linesRemoved":1,"summary":"Added AnimatePresence wrapper"}
{"ts":"2026-06-24T11:45:00Z","type":"merge","phase":"P1.2","agent":"A1","result":"pass","gates":{"tsc":"pass","lint":"pass"},"files":["package.json","providers.tsx"]}
```

### Dashboard UI Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  🛠 DEVELOPMENT MONITOR                    [Auto-refresh: 3s]        │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─── LEFT ──────────────────┐  ┌─── RIGHT ───────────────────────┐ │
│  │                           │  │                                   │ │
│  │  PHASE PROGRESS           │  │  LIVE ACTIVITY FEED              │ │
│  │                           │  │                                   │ │
│  │  P1 UI Excellence    75%  │  │  12:05 🚀 A2 started P1.3        │ │
│  │  ████████████░░░░░░       │  │  12:03 📝 A2 wrote layout.tsx     │ │
│  │  ├── ✅ P1.1 Geist        │  │  11:45 ✅ MERGED P1.2 → develop  │ │
│  │  ├── ✅ P1.2 Motion       │  │     ├── tsc    ✅                │ │
│  │  ├── 🔄 P1.3 Transitions  │  │     └── lint   ✅                │ │
│  │  ├── ⬜ P1.4 Animations   │  │  11:30 🚀 A1 started P2.1        │ │
│  │  └── ⬜ P1.5 Counters     │  │  11:15 ❌ GATE FAILED P1.2       │ │
│  │                           │  │     └── tsc ❌ 2 errors           │ │
│  │  P2 Auth & Profile   15%  │  │  11:00 📝 A1 wrote package.json  │ │
│  │  ███░░░░░░░░░░░░░░░░░    │  │                                   │ │
│  │  ├── ✅ P2.1 Models       │  │  [Load more...]                   │ │
│  │  └── 🔄 P2.2 PostgreSQL   │  └───────────────────────────────────┘ │
│  │                           │                                        │
│  └───────────────────────────┘                                        │
│                                                                        │
│  ┌─── DETAIL PANEL (click item to show) ─────────────────────────────┐│
│  │                                                                     ││
│  │  P1.3 → Page Transitions           Branch: feature/P1.3           ││
│  │  User Flow: Given I navigate pages, content fades                 ││
│  │  Scope: layout.tsx, providers.tsx, page.tsx files                 ││
│  │  Agent: A2 | Status: 🔄 In Progress                               ││
│  │  ┌── Activity for this item ──────────────────────────────────┐  ││
│  │  │  12:05 🚀 A2 started                                       │  ││
│  │  │  12:03 📝 Wrote layout.tsx — AnimatePresence               │  ││
│  │  └────────────────────────────────────────────────────────────┘  ││
│  └──────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. E2E Testing Strategy

| Element | Detail |
|---|---|
| **Framework** | Playwright |
| **Location** | `tests/modules/P<phase>-<name>.spec.ts` |
| **RED phase** | Tests written BEFORE implementation — they fail initially |
| **GREEN phase** | Tests pass after implementation |
| **Regression** | Full suite runs before every merge |
| **Coverage** | Every user flow from Gherkin becomes a test case |

```typescript
// Example: tests/modules/P3-multiselect.spec.ts
test('User can filter by multiple vendors', async ({ page }) => {
  await page.goto('/expenses')
  await page.click('[data-testid="vendor-filter"]')
  await page.check('text=Big Bazaar')
  await page.check('text=D-Mart')
  await expect(page.locator('table tr')).toHaveCount(5)
  await page.click('[data-testid="clear-filter"]')
  await expect(page.locator('table tr')).toHaveCount(20) // all back
})
```

---

## 8. Review Workflow for You

| Stage | What You See | Your Action |
|---|---|---|
| **Design (Phase A4)** | User flow (Gherkin) + API contract | Approve or request changes |
| **Implementation (Phase B)** | Progress bar fills up, activity log updates | Wait (watch live on dashboard) |
| **Gate (Phase C)** | Dashboard shows gate running → ✅/❌ | No action needed |
| **Walkthrough (Phase D)** | I report each step: ✅ or ❌ | No action needed |
| **Merge (Phase E)** | Dashboard shows "Ready for review" | **You** review and say "Ship it" or "Fix this" |
| **After merge** | Dashboard updated, next task queued | Approve next design |

---

## 9. Build Number Convention

When a feature branch merges to `develop`, we tag with a sequential build number:

```
git tag build-001   (first feature merged)
git tag build-002   (second feature merged)
...
```

Major version bumps happen when a set of features is promoted from `develop` to `main`:

```
git checkout main && git merge develop
git tag v1.0.0
```

---

## 10. Tools & Dependencies

| Tool | Purpose | When Needed |
|---|---|---|
| Git | Branching, version control | Now |
| Playwright | E2E tests | Phase D (future) |
| Node.js 22+ | Runtime | Now |
| Express (optional) | Dev dashboard server | Optional |
| npm | Package management | Now |

---

## 11. Changelog

| Date | Author | Changes |
|---|---|---|
| 24-Jun-2026 | System | Initial document — full agentic process definition |
| 09-Jul-2026 | System | Consolidated in `PRODUCT-PLAN.md` — refer there for unified product plan. |
