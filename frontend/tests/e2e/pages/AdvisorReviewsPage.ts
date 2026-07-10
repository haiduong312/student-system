import { expect, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export interface AdvisorReviewStudentOption {
  fullName: string;
  studentCode: string;
  className?: string | null;
}

export class AdvisorReviewsPage extends PageObject {
  static readonly route = '/lecturer/reviews';

  readonly title;

  constructor(page: Page) {
    super(page);
    this.title = this.heading('Advisor Reviews');
  }

  async goto() {
    await this.page.goto(AdvisorReviewsPage.route);
  }

  async expectLoaded() {
    await this.expectPath(AdvisorReviewsPage.route);
    await expect(this.title).toBeVisible();
    await expect(this.page.getByText('Assigned student', { exact: true })).toBeVisible();
  }

  async selectAssignedStudent(student: AdvisorReviewStudentOption) {
    const combobox = this.page
      .getByTestId('advisor-review-student-select')
      .getByRole('combobox');
    const optionLabel = `${student.fullName} (${student.studentCode}) · ${
      student.className || 'No class'
    }`;

    await combobox.click();
    await combobox.fill(student.fullName);
    const option = this.page
      .locator('.ant-select-dropdown:visible')
      .getByText(optionLabel, { exact: true })
      .last();
    await expect(option).toBeVisible();
    await option.click();

    await expect(this.page.getByText(student.fullName, { exact: true })).toBeVisible();
    await expect(
      this.page.getByText(
        `${student.studentCode} · ${student.className || 'No class'}`,
        { exact: true },
      ),
    ).toBeVisible();
  }

  async createReview(reviewContent: string, suggestion?: string) {
    await this.page.getByRole('button', { name: 'Add review' }).click();
    const modal = this.page.getByRole('dialog', { name: /Review / });
    await expect(modal).toBeVisible();
    await modal.getByLabel('Review').fill(reviewContent);
    if (suggestion) {
      await modal.getByLabel('Suggestion').fill(suggestion);
    }
    await modal.getByRole('button', { name: 'Create review' }).click();
    await this.expectMessage('Advisor review created.');
  }

  async expectReview(reviewContent: string) {
    await expect(this.reviewRow(reviewContent)).toBeVisible();
  }

  async openReviewDetails(reviewContent: string) {
    await this.reviewRow(reviewContent).getByRole('button', { name: 'View' }).click();
    await expect(this.detailDrawer()).toBeVisible();
  }

  async expectReviewDetails(reviewContent: string, suggestion?: string) {
    const drawer = this.detailDrawer();
    await expect(drawer.getByText(reviewContent, { exact: true })).toBeVisible();
    if (suggestion) {
      await expect(drawer.getByText(suggestion, { exact: true })).toBeVisible();
    }
  }

  private reviewRow(reviewContent: string) {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByText(reviewContent, { exact: true }) });
  }

  private detailDrawer() {
    return this.page.getByRole('dialog', { name: 'Advisor review details' });
  }
}
