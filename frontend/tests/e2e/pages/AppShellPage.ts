import { expect, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export class AppShellPage extends PageObject {
  readonly logoutButton;

  constructor(page: Page) {
    super(page);
    this.logoutButton = page.getByRole('button', { name: 'Logout' });
  }

  async logout() {
    await this.logoutButton.click();
    await expect(this.page).toHaveURL((url) => url.pathname === '/login');
  }
}
