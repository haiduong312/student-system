import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { loginAsRole } from './utils/auth';
import {
  AUTH_STATE_DIRECTORY,
  saveRoleStorageState,
} from './utils/auth-state';
import { getTestEnvironment, type TestRole } from './utils/test-env';

const roles: TestRole[] = ['ADMIN', 'STUDENT', 'LECTURER'];

export default async function globalSetup() {
  const environment = getTestEnvironment();
  await mkdir(AUTH_STATE_DIRECTORY, { recursive: true });

  const browser = await chromium.launch();
  try {
    for (const role of roles) {
      const context = await browser.newContext({
        baseURL: environment.E2E_BASE_URL,
      });
      const page = await context.newPage();

      try {
        await loginAsRole(page, role);
        await saveRoleStorageState(context, role);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
