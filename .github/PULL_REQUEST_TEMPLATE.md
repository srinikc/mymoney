## Description

<!-- Brief description of the change -->

## Checklist

### Code Review
- [ ] Code reviewed by another team member
- [ ] No `console.log` left in production code
- [ ] No `any` types (TypeScript strict)
- [ ] Error states handled (loading, empty, error)

### Testing
- [ ] Unit tests added/updated (`npm test` — vitest)
- [ ] Unit tests pass: `__/__`
- [ ] E2E tests added/updated (Playwright)
- [ ] E2E tests pass: `__/__`
- [ ] Manual walkthrough done (every button, link, state)

### Build
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (no new errors)

### Override
- [ ] PO approved to skip checks (reason: _________)

<!-- This PR cannot be merged without all checkboxes marked ✅ or PO override approved -->
