import { test } from '../fixtures';
import {
  AdminDashboardPage,
  CatalogManagementPage,
  LecturerDashboardPage,
  LoginPage,
  StudentDashboardPage,
} from '../pages';
import {
  expectRoleBlocked,
  expectUnauthenticatedBlocked,
  loginAsAdmin,
  loginAsLecturer,
  loginAsStudent,
  logout,
} from '../utils/auth';
import { saveRoleStorageState } from '../utils/auth-state';
import { getTestEnvironment } from '../utils/test-env';

test.describe('Authentication', () => {
  test('logs in successfully as an admin', async ({ page }) => {
    await loginAsAdmin(page);
    await saveRoleStorageState(page.context(), 'ADMIN');

    await new AdminDashboardPage(page).expectLoaded();
  });

  test('logs in successfully as a student', async ({ page }) => {
    await loginAsStudent(page);
    await saveRoleStorageState(page.context(), 'STUDENT');

    await new StudentDashboardPage(page).expectLoaded();
  });

  test('logs in successfully as a lecturer or advisor', async ({ page }) => {
    await loginAsLecturer(page);
    await saveRoleStorageState(page.context(), 'LECTURER');

    await new LecturerDashboardPage(page).expectLoaded();
  });

  test('rejects an unknown email', async ({ page }) => {
    const environment = getTestEnvironment();
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.fillForm(
      `missing-${Date.now()}@example.invalid`,
      environment.ADMIN_PASSWORD,
    );
    await loginPage.submit();
    await loginPage.expectLoginFailed();
  });

  test('rejects an incorrect password', async ({ page }) => {
    const environment = getTestEnvironment();
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.fillForm(
      environment.ADMIN_EMAIL,
      `${environment.ADMIN_PASSWORD}-incorrect`,
    );
    await loginPage.submit();
    await loginPage.expectLoginFailed();
  });

  test('logs out successfully', async ({ adminPage }) => {
    const dashboard = new AdminDashboardPage(adminPage);
    await dashboard.goto();
    await dashboard.expectLoaded();

    await logout(adminPage);
  });
});

test.describe('Private routes', () => {
  for (const privateRoute of [
    '/admin/dashboard',
    '/student/dashboard',
    '/lecturer/dashboard',
  ]) {
    test(`redirects an unauthenticated user from ${privateRoute} to login`, async ({
      page,
    }) => {
      await expectUnauthenticatedBlocked(page, privateRoute);
    });
  }
});

test.describe('Role-based access control', () => {
  test('allows an admin to access management screens', async ({ adminPage }) => {
    const catalog = new CatalogManagementPage(adminPage, 'skills');
    await catalog.goto();
    await catalog.expectLoaded();
  });

  test('blocks a student from admin screens', async ({ studentPage }) => {
    await expectRoleBlocked(studentPage, '/admin/dashboard');
  });

  test('blocks a lecturer from admin screens', async ({ lecturerPage }) => {
    await expectRoleBlocked(lecturerPage, '/admin/dashboard');
  });

  test('allows a lecturer only in the lecturer area', async ({ lecturerPage }) => {
    const dashboard = new LecturerDashboardPage(lecturerPage);
    await dashboard.goto();
    await dashboard.expectLoaded();

    await expectRoleBlocked(lecturerPage, '/student/dashboard');
  });

  test('allows a student only in the student area', async ({ studentPage }) => {
    const dashboard = new StudentDashboardPage(studentPage);
    await dashboard.goto();
    await dashboard.expectLoaded();

    await expectRoleBlocked(studentPage, '/lecturer/dashboard');
  });
});
