import { expect, type Page } from '@playwright/test';
import { AppShellPage } from '../pages/AppShellPage';
import { LoginPage } from '../pages/LoginPage';
import { getRoleCredentials, type TestRole } from './test-env';

export const roleHomePaths: Record<TestRole, string> = {
  ADMIN: '/admin/dashboard',
  STUDENT: '/student/dashboard',
  LECTURER: '/lecturer/dashboard',
};

export async function loginAsAdmin(page: Page) {
  await loginAsRole(page, 'ADMIN');
}

export async function loginAsStudent(page: Page) {
  await loginAsRole(page, 'STUDENT');
}

export async function loginAsLecturer(page: Page) {
  await loginAsRole(page, 'LECTURER');
}

export async function loginAsRole(page: Page, role: TestRole) {
  const credentials = getRoleCredentials(role);
  await new LoginPage(page).login(
    credentials.email,
    credentials.password,
    roleHomePaths[role],
  );
}

export async function logout(page: Page) {
  await new AppShellPage(page).logout();
}

export async function expectRoleBlocked(page: Page, forbiddenRoute: string) {
  await page.goto(forbiddenRoute);

  await expect(page).toHaveURL((url) => url.pathname === '/login');
  await expect(
    page.getByRole('heading', { name: 'Student Competency Profile' }),
  ).toBeVisible();
}

export async function expectUnauthenticatedBlocked(
  page: Page,
  privateRoute: string,
) {
  await page.goto(privateRoute);

  await expect(page).toHaveURL(
    (url) =>
      url.pathname === '/login' && url.searchParams.get('next') === privateRoute,
  );
  await expect(
    page.getByRole('heading', { name: 'Student Competency Profile' }),
  ).toBeVisible();
}
