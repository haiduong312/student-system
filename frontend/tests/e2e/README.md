# Playwright E2E

E2E tests live under `frontend/tests/e2e` and run against the real frontend plus backend API. Use only test accounts and a disposable/safe database because the suite creates, updates, verifies, rejects, and deactivates E2E-prefixed data.

Last local verification: `39 passed (2.8m)`.

## Install

From `frontend`:

```bash
npm install
npx playwright install chromium
```

## Configure `.env.e2e`

Copy the example file and fill in local or CI-safe values:

```bash
cp .env.e2e.example .env.e2e
```

Required variables:

```bash
E2E_BASE_URL=http://127.0.0.1:3000
E2E_API_BASE_URL=http://127.0.0.1:4000/api

E2E_START_WEB_SERVERS=true
E2E_REUSE_EXISTING_SERVER=true
E2E_DATABASE_URL=

ADMIN_EMAIL=
ADMIN_PASSWORD=
LECTURER_EMAIL=
LECTURER_PASSWORD=
STUDENT_EMAIL=
STUDENT_PASSWORD=
```

Notes:

- `E2E_START_WEB_SERVERS=true` lets Playwright start the backend and frontend.
- Set `E2E_START_WEB_SERVERS=false` when testing an already-running local or deployed environment.
- Set `E2E_REUSE_EXISTING_SERVER=false` when you want each run to start fresh web servers.
- `E2E_DATABASE_URL` is optional but strongly recommended in CI so E2E data cannot touch development or production data.
- Never commit real credentials. Keep them in `.env.e2e` or CI secrets.

## Run tests

From `frontend`:

```bash
npm run test:e2e
```

Useful variants:

```bash
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:headed   # Visible browser
npm run test:e2e:report   # Open latest HTML report
```

Run a focused suite:

```bash
npx playwright test tests/e2e/auth/auth.spec.ts
npx playwright test tests/e2e/advisor/advisor-flow.spec.ts
npx playwright test tests/e2e/student/assessment.spec.ts
```

Run with explicit env values, useful for one-off local checks:

```bash
E2E_BASE_URL=http://127.0.0.1:3000 \
E2E_API_BASE_URL=http://127.0.0.1:4000/api \
E2E_START_WEB_SERVERS=true \
E2E_REUSE_EXISTING_SERVER=false \
npm run test:e2e
```

## Debugging

- Use UI mode: `npm run test:e2e:ui`.
- Use headed mode: `npm run test:e2e:headed`.
- Open the report after a run: `npm run test:e2e:report`.
- Failure artifacts are written under `frontend/test-results/e2e`.
- Config keeps screenshots and videos only on failure and enables traces on first retry in CI.

Prefer Playwright auto-waiting and explicit assertions:

```ts
await expect(locator).toBeVisible();
await expect(page).toHaveURL((url) => url.pathname === '/student/dashboard');
await expect.poll(async () => api.getStatus()).toBe('VERIFIED');
```

Do not add `waitForTimeout` unless there is no observable UI/API state to wait for.

## Authenticated fixtures

Global setup signs in once for each role and writes storage state under `playwright/.auth`.

Use the role fixtures instead of repeating login UI in every test:

```ts
import { test } from './fixtures';

test('student flow', async ({ studentPage }) => {
  await studentPage.goto('/student/profile');
});
```

Available fixtures:

- `adminPage`
- `studentPage`
- `lecturerPage`

The suite runs with `workers: 1` and `fullyParallel: false` because the fixtures reuse a small set of role accounts and persist rotated refresh cookies.

Reusable auth helpers are exported from `utils/auth.ts`: `loginAsAdmin`, `loginAsStudent`, `loginAsLecturer`, `logout`, `expectRoleBlocked`, and `expectUnauthenticatedBlocked`.

## Page objects and selectors

Page objects are exported from `pages/index.ts`. Each main screen exposes `goto()`, stable locators, reusable actions, and `expectLoaded()`.

Selector preference:

1. `getByRole`
2. `getByLabel`
3. `getByPlaceholder`
4. `getByText` when content is domain data
5. `getByTestId` only for controls that are difficult to select semantically

Current minimal `data-testid` usage:

- Login inputs/button/error alert
- Assessment start/submit buttons
- Evidence upload submit button
- Recommendation cards
- Roadmap items
- Advisor review assigned-student select

## Current coverage

The suite currently covers:

- Smoke test for opening the app.
- Authentication: login success/failure, logout, unauthenticated private-route redirect, and role-based route boundaries.
- Admin catalog management: skill categories, skills, career goals, specializations, career required skills.
- Admin question bank: question creation, options, correct answer, filtering, editing, deactivation.
- Student profile/resources: profile links/summary, skills, projects, certificates, activities, experiences.
- Student evidence: URL evidence submission and PENDING status.
- Lecturer/Advisor evidence review: verify and reject evidence, with student-visible final state checked through API polling.
- Lecturer/Advisor flow: dashboard, assigned student scope, ACTIVE assignment visibility, inactive-assignment boundary, student detail/profile/resources/analysis metrics, evidence approval, AdvisorReview creation and detail view, forbidden API boundaries.
- Assessment: start, context check, IN_PROGRESS state, validation when answers are missing, submit/grading, result table, duplicate submit prevention, missing active-question error path.
- Competency analysis: metrics, skill gap status, history lifecycle with CURRENT/OBSOLETE.
- Suggested actions: compact Analysis summary, Roadmap review selection, and atomic exclusion during generation.
- Roadmap: generation, roadmap item order/status/phase, progress updates, completion history.
- Page-object route sanity checks for primary Admin/Student/Lecturer pages.

## Known gaps / not yet covered

- Browser coverage is Chromium only; Firefox/WebKit and responsive/mobile layouts are not included.
- File upload is covered mostly through evidence URL flows; private file preview/download behavior is not deeply asserted.
- Report/export pages are only lightly covered by route access, not by generated file content.
- Notifications are not covered beyond side effects triggered by other flows.
- Dashboard visual charts/aggregations are checked at a smoke/metric level, not exhaustively against all formulas.
- CI workflow is not present in this repository yet.

## Suggested CI workflow

No `.github/workflows` directory is currently present. If the project adopts GitHub Actions, add a workflow similar to this and provide the secrets listed in `.env.e2e.example`:

```yaml
name: Playwright E2E

on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: |
            frontend/package-lock.json
            backend/package-lock.json
      - run: npm ci
      - run: npm ci
        working-directory: backend
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          CI: true
          E2E_BASE_URL: http://127.0.0.1:3000
          E2E_API_BASE_URL: http://127.0.0.1:4000/api
          E2E_START_WEB_SERVERS: true
          E2E_REUSE_EXISTING_SERVER: false
          E2E_DATABASE_URL: ${{ secrets.E2E_DATABASE_URL }}
          ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
          ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
          LECTURER_EMAIL: ${{ secrets.LECTURER_EMAIL }}
          LECTURER_PASSWORD: ${{ secrets.LECTURER_PASSWORD }}
          STUDENT_EMAIL: ${{ secrets.STUDENT_EMAIL }}
          STUDENT_PASSWORD: ${{ secrets.STUDENT_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report
```
