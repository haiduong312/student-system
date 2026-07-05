import { expect, test } from '@playwright/test';
import { LoginPage } from './pages';

test('opens the login page from the application root', async ({ page }) => {
  await page.goto('/');

  const loginPage = new LoginPage(page);
  await loginPage.expectLoaded();
  await expect(loginPage.emailInput).toBeVisible();
});
