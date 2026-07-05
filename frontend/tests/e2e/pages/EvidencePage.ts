import { expect, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export type EvidencePageMode = 'student' | 'lecturer';

export class EvidencePage extends PageObject {
  readonly route: string;
  readonly title;

  constructor(page: Page, mode: EvidencePageMode = 'student') {
    super(page);
    this.route = mode === 'student' ? '/student/evidences' : '/lecturer/evidences';
    this.title = this.heading(
      mode === 'student' ? 'Evidences' : 'Pending Evidences',
    );
  }

  async goto() {
    await this.page.goto(this.route);
  }

  async expectLoaded() {
    await this.expectPath(this.route);
    await expect(this.title).toBeVisible();
    await expect(this.page.getByRole('table')).toBeVisible();
  }

  evidenceRow(text: string) {
    return this.tableRow(text);
  }

  async verifyEvidence(rowText: string, currentLevel?: number) {
    const row = this.evidenceRow(rowText);
    await row.getByRole('button', { name: 'Verify' }).click();

    if (currentLevel !== undefined) {
      const confirmation = this.dialog('Verify skill evidence');
      await this.selectOption(
        confirmation.getByRole('combobox'),
        String(currentLevel),
      );
      await confirmation.getByRole('button', { name: 'Verify' }).click();
    }

    await this.expectMessage('Verified');
  }

  async rejectEvidence(rowText: string, reason: string) {
    const row = this.evidenceRow(rowText);
    await row.getByRole('button', { name: 'Reject' }).click();

    const confirmation = this.dialog('Reject evidence');
    await confirmation.getByPlaceholder('Reason').fill(reason);
    await confirmation.getByRole('button', { name: 'Reject' }).click();
    await this.expectMessage('Rejected');
  }

  async expectEvidenceStatus(rowText: string, status: string) {
    await expect(this.evidenceRow(rowText).getByText(status, { exact: true })).toBeVisible();
  }

  async expectReviewerNote(rowText: string, reviewerNote: string) {
    await expect(
      this.evidenceRow(rowText).getByText(reviewerNote, { exact: true }),
    ).toBeVisible();
  }
}
