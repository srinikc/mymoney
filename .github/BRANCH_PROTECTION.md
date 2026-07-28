# Branch Protection Setup

You need to configure these in GitHub repo settings manually (requires repo owner):

## 1. Go to: Settings → Branches → Add Rule

### Rule for `develop`
- [x] Require a pull request before merging
  - [x] Require approvals (1)
- [x] Require status checks to pass before merging
  - [x] `build` (from CI workflow)
- [x] Require conversation resolution before merging

### Rule for `main`
- [x] Require a pull request before merging
  - [x] Require approvals (2)
- [x] Require status checks to pass before merging
- [x] Do not allow bypassing the above settings (include administrators)

## 2. Local enforcement (husky)

Already configured:
- `.husky/pre-commit` → lint check
- `.husky/pre-push` → build + unit tests

Override (PO only): `git commit --no-verify` or `git push --no-verify`

## 3. PR Workflow

1. Create feature branch from `develop`
2. Write code + tests
3. Run `npm test` and `npx playwright test`
4. Create PR with filled checklist
5. CI runs automatically (build, lint, test, E2E)
6. Code review by another person
7. PO approves → merge
