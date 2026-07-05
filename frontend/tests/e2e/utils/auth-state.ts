import path from 'node:path';
import type { BrowserContext } from '@playwright/test';
import type { TestRole } from './test-env';

export const AUTH_STATE_DIRECTORY = path.resolve(
  __dirname,
  '../../../playwright/.auth',
);

export const authStatePaths: Record<TestRole, string> = {
  ADMIN: path.join(AUTH_STATE_DIRECTORY, 'admin.json'),
  STUDENT: path.join(AUTH_STATE_DIRECTORY, 'student.json'),
  LECTURER: path.join(AUTH_STATE_DIRECTORY, 'lecturer.json'),
};

export async function saveRoleStorageState(
  context: BrowserContext,
  role: TestRole,
) {
  await context.storageState({ path: authStatePaths[role] });
}
