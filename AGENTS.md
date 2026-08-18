# Cross-Platform Development Rule

**Every feature or fix must be implemented in BOTH:**
1. Web app (`src/` — Next.js)
2. Mobile app (`mobile/` — Expo/React Native)

No feature is considered complete until both platforms have matching implementations.

# Work Process (MANDATORY — follow for EVERY task)

For every change, feature, or fix, follow this exact sequence, in order:

1. **Design** — plan the approach before writing code.
2. **Verify design against requirements** — re-read the user's stated requirement(s) and confirm the design covers every point.
3. **Dependency/Regression Check** — BEFORE changing anything, identify ALL places that depend on or reference the code being changed (imports, API consumers, DB schema, shared libs, tests, scripts, web AND mobile). Update every dependent/referenced place in the same change — or ask the user which direction to take — so the change is consistent everywhere with NO regressions. Do NOT change one side and leave the other broken.
4. **Code** — implement per the design.
5. **Verify code against requirements** — check the syntax, logic, and that ALL paths/edge cases are covered, against the requirement(s) given.
6. **Code review** — review the diff for correctness, style, and accidental issues.
7. **Verify everything works** — run typecheck/lint/tests and exercise the feature against the requirements.
8. **Fix** — resolve any issues found.
9. **No regressions** — confirm existing working features are not broken.

Do NOT skip steps. Do NOT claim completion until all 9 steps are done.

# Mandatory Verification Before "Done" (MANDATORY — for EVERY change)

Do NOT say a change is "completed" or "done" until ALL of the following layers are
tested and confirmed working for that change:

1. **API layer** — every affected API route is exercised with a real request:
   - Confirm the route returns the expected status codes (200/201/400/401/404/409, etc.)
   - Confirm the response shape/fields are correct
   - Confirm edge cases (empty input, invalid input, not-found, unauthenticated) behave correctly
   - Confirm the running dev/prod server actually recompiled the changed route (verify `.next` build output or hit the endpoint directly)
2. **DB layer** — verify the data actually persisted/updated/deleted correctly:
   - Query the database (Prisma/PG) directly to confirm rows are created/updated/deleted as expected
   - Confirm relationships/foreign keys/unique constraints are respected
   - Confirm no orphaned or duplicate rows were created
3. **UI end-to-end layer** — exercise the feature as the user would in the UI (web AND mobile):
   - Click through the actual user flow in the browser (or reproduce the exact requests the UI sends)
   - Confirm the UI reflects the correct state after the action (lists refresh, counts update, no stale data)
   - Confirm the URL/routes are correct
   - Confirm the mobile app (if affected) behaves identically to web
   - For data-list flows: verify counts shown match the DB truth (e.g. an "unmapped" count must match the real DB query, not a capped/sliced subset)

Rule: if you only tested the data layer (e.g. Prisma insert works) but did NOT test
the API route AND the UI flow end-to-end, you must say the change is NOT done yet.
A change is only done when all three layers pass.

Do NOT skip steps. Do NOT claim completion until all 9 steps are done.

## graphify

This project has a graphify knowledge graph at .graphify/.

Rules:
- For codebase or architecture questions, when `.graphify/graph.json` exists, first run `graphify query "<question>"` (or `graphify path "<A>" "<B>"` / `graphify explain "<concept>"`); these return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output
- If .graphify/wiki/index.md exists, navigate it instead of reading raw files
- If .graphify/graph.json is missing but graphify-out/graph.json exists, run `graphify migrate-state --dry-run` first; if tracked legacy artifacts are reported, ask before using the recommended `git mv -f graphify-out .graphify` and commit message
- If .graphify/needs_update exists or .graphify/branch.json has stale=true, warn before relying on semantic results and run the graphify skill with --update when appropriate
- If the user asks to build, update, query, path, or explain the graph, use the installed `graphify` skill instead of ad-hoc file traversal
- Before proposing or committing .graphify artifacts, run `graphify portable-check .graphify`; commit-safe graph artifacts must use repo-relative paths, and never commit .graphify/branch.json, .graphify/worktree.json, .graphify/needs_update, or .graphify/cache/. If a repo already tracks any of them, first add them to .gitignore, then propose `git rm --cached .graphify/branch.json .graphify/worktree.json .graphify/needs_update` and `git rm -r --cached .graphify/cache`; never mutate git state without asking
- Before deep graph traversal, prefer `graphify summary --graph .graphify/graph.json` for compact first-hop orientation
- For review impact on changed files, use `graphify review-delta --graph .graphify/graph.json` instead of generic traversal
- Read `.graphify/GRAPH_REPORT.md` only for broad architecture review or when `query` / `path` / `explain` do not surface enough context
- After modifying code files in this session, run `npx graphify hook-rebuild` to keep the graph current
