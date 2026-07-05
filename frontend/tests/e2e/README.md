# Playwright E2E

1. Run `npm install` and `npx playwright install chromium` in the `frontend` directory.
2. Copy `.env.e2e.example` to `.env.e2e` and update the endpoints and credentials.
3. Ensure the configured E2E database is safe to mutate. Playwright starts the frontend and backend automatically by default.
4. Run `npm run test:e2e` from the `frontend` directory.

Useful commands:

- `npm run test:e2e:ui` opens Playwright UI mode.
- `npm run test:e2e:headed` runs with a visible browser.
- `npm run test:e2e:report` opens the latest HTML report.

Set `E2E_START_WEB_SERVERS=false` when the application is already running or when targeting a deployed environment.

## Authenticated tests

Global setup signs in once for each role and writes state files under `playwright/.auth`.
Use the role fixtures instead of repeating the login UI in every test:

```ts
import { test } from './fixtures';

test('student flow', async ({ studentPage }) => {
  await studentPage.goto('/student/profile');
});
```

Available fixtures are `adminPage`, `studentPage`, and `lecturerPage`. The fixture
persists the latest rotated refresh cookie after each test, so authenticated tests
must remain sequential until each worker has dedicated accounts.

Reusable auth helpers are exported from `utils/auth.ts`: `loginAsAdmin`,
`loginAsStudent`, `loginAsLecturer`, `logout`, and `expectRoleBlocked`.

## Page objects

Page objects are exported from `pages/index.ts`. Each main screen exposes its
real route through `goto()`, stable semantic locators, reusable actions, and an
`expectLoaded()` assertion.

```ts
import { StudentProfilePage } from './pages';

const profile = new StudentProfilePage(studentPage);
await profile.goto();
await profile.expectLoaded();
await profile.fillForm({ summary: 'Updated by an E2E test' });
await profile.save();
```
