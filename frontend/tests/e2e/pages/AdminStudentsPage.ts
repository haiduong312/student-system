import { expect, type Locator, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export class AdminStudentsPage extends PageObject {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto('/admin/students');
  }

  async expectLoaded() {
    await this.expectPath('/admin/students');
    await expect(this.heading('Students')).toBeVisible();
    await expect(this.page.getByRole('button', { name: /Import/ })).toBeVisible();
  }

  async openImport() {
    await this.page.getByRole('button', { name: /Import/ }).click();
    const modal = this.dialog('Import students');
    await expect(modal).toBeVisible();
    return modal;
  }

  async uploadCsv(modal: Locator, content: string) {
    await modal.locator('input[type="file"]').setInputFiles({
      name: 'students.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(content),
    });
  }

  async expectPreview(modal: Locator, count: number) {
    await expect(modal.getByRole('heading', { name: 'Import preview' })).toBeVisible();
    await expect(modal.getByText(`${count} ready`, { exact: true })).toBeVisible();
  }

  async submitImport(modal: Locator, count: number) {
    await modal.getByRole('button', { name: `Import ${count} students` }).click();
    const result = this.dialog('Import result');
    await expect(result).toBeVisible();
    return result;
  }

  async expectResult(
    modal: Locator,
    expected: { created: number; skipped: number; failed: number },
  ) {
    for (const [label, value] of Object.entries(expected)) {
      await expect(
        modal.locator('.ant-statistic').filter({ hasText: capitalize(label) }),
      ).toContainText(String(value));
    }
  }

  async closeResult(modal: Locator) {
    await modal.getByRole('button', { name: 'Done' }).click();
    await expect(modal).toBeHidden();
  }

  async search(search: string) {
    await this.page.getByPlaceholder('Name, email, or student code').fill(search);
    await this.page.getByRole('button', { name: /Search/ }).click();
  }

  async expectStudent(email: string) {
    await expect(this.tableRow(email)).toBeVisible();
  }

  async deactivateStudent(email: string) {
    const row = this.tableRow(email);
    await row.getByRole('button', { name: 'Deactivate', exact: true }).click();
    const confirmation = this.dialog('Deactivate student?');
    await confirmation.getByRole('button', { name: 'Deactivate', exact: true }).click();
    await this.expectMessage('Student deactivated.');
    await expect(row).toContainText('INACTIVE');
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
