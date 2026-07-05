import { expect, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export class LoginPage extends PageObject {
  readonly title;
  readonly emailInput;
  readonly passwordInput;
  readonly submitButton;
  readonly loginError;

  constructor(page: Page) {
    super(page);
    this.title = this.heading('Student Competency Profile');
    // Form.Item does not currently associate these labels with their controls.
    this.emailInput = page.locator('input[autocomplete="email"]');
    this.passwordInput = page.locator(
      'input[autocomplete="current-password"]',
    );
    this.submitButton = page.getByRole('button', { name: 'Login' });
    this.loginError = page.getByText('Login failed', { exact: true });
  }

  async goto() {
    await this.page.goto('/login');
    await this.expectLoaded();
  }

  async expectLoaded() {
    await this.expectPath('/login');
    await expect(this.title).toBeVisible();
    await expect(this.submitButton).toBeVisible();
  }

  async fillForm(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit(expectedHomePath?: string) {
    if (!expectedHomePath) {
      await this.submitButton.click();
      return;
    }

    await Promise.all([
      this.page.waitForURL((url) => url.pathname === expectedHomePath),
      this.submitButton.click(),
    ]);
  }

  async login(email: string, password: string, expectedHomePath: string) {
    await this.goto();
    await this.fillForm(email, password);
    await this.submit(expectedHomePath);
  }

  async expectLoginFailed() {
    await this.expectPath('/login');
    await expect(this.loginError).toBeVisible();
  }
}
