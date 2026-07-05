import {
  expect,
  test as base,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { loginAsRole } from '../utils/auth';
import { authStatePaths, saveRoleStorageState } from '../utils/auth-state';
import { getTestEnvironment, type TestRole } from '../utils/test-env';

const REFRESH_TOKEN_COOKIE_NAME = 'student_system_refresh_token';

interface AuthenticatedPages {
  adminPage: Page;
  studentPage: Page;
  lecturerPage: Page;
}

export const test = base.extend<AuthenticatedPages>({
  adminPage: async ({ browser }, use) => {
    await withRolePage(browser, 'ADMIN', use);
  },
  studentPage: async ({ browser }, use) => {
    await withRolePage(browser, 'STUDENT', use);
  },
  lecturerPage: async ({ browser }, use) => {
    await withRolePage(browser, 'LECTURER', use);
  },
});

export { expect };

async function withRolePage(
  browser: Browser,
  role: TestRole,
  run: (page: Page) => Promise<void>,
) {
  const environment = getTestEnvironment();
  const context = await browser.newContext({
    baseURL: environment.E2E_BASE_URL,
    storageState: authStatePaths[role],
  });
  const page = await context.newPage();

  try {
    await run(page);
  } finally {
    await restoreLoggedOutSession(context, role);
    await saveRoleStorageState(context, role);
    await context.close();
  }
}

async function restoreLoggedOutSession(
  context: BrowserContext,
  role: TestRole,
) {
  const cookies = await context.cookies();
  if (cookies.some((cookie) => cookie.name === REFRESH_TOKEN_COOKIE_NAME)) {
    return;
  }

  const recoveryPage = await context.newPage();
  try {
    await loginAsRole(recoveryPage, role);
  } finally {
    await recoveryPage.close();
  }
}
