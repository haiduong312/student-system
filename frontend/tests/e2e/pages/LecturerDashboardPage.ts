import { expect, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export class LecturerDashboardPage extends PageObject {
  static readonly route = '/lecturer/dashboard';

  readonly title;
  readonly studentCountMetric;
  readonly weakStudentsMetric;
  readonly pendingEvidenceMetric;

  constructor(page: Page) {
    super(page);
    this.title = this.heading('Lecturer Dashboard');
    this.studentCountMetric = page.getByText('Student Count', { exact: true });
    this.weakStudentsMetric = page.getByText('Weak Students', { exact: true });
    this.pendingEvidenceMetric = page.getByText('Pending Evidence', {
      exact: true,
    });
  }

  async goto() {
    await this.page.goto(LecturerDashboardPage.route);
  }

  async expectLoaded() {
    await this.expectPath(LecturerDashboardPage.route);
    await expect(this.title).toBeVisible();
    await expect(this.studentCountMetric).toBeVisible();
    await expect(this.weakStudentsMetric).toBeVisible();
    await expect(this.pendingEvidenceMetric).toBeVisible();
  }

  async goToEvidenceReview() {
    await this.page.getByRole('menuitem', { name: 'Evidences' }).click();
    await this.expectPath('/lecturer/evidences');
  }
}
