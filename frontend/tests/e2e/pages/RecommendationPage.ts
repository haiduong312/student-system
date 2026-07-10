import { expect, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export type RecommendationTab = 'Active' | 'Done' | 'Dismissed';

export class RecommendationPage extends PageObject {
  static readonly route = '/student/recommendations';

  readonly title;

  constructor(page: Page) {
    super(page);
    this.title = this.heading('Recommendations');
  }

  async goto() {
    await this.page.goto(RecommendationPage.route);
  }

  async expectLoaded() {
    await this.expectPath(RecommendationPage.route);
    await expect(this.title).toBeVisible();
    await expect(this.page.getByRole('tab', { name: 'Active' })).toBeVisible();
  }

  recommendation(title: string) {
    return this.page.getByTestId('recommendation-card').filter({ hasText: title });
  }

  async openTab(tab: RecommendationTab) {
    await this.page.getByRole('tab', { name: tab, exact: true }).click();
  }

  async updateStatus(title: string, status: string) {
    await this.selectOption(
      this.page.getByRole('combobox', {
        name: `Recommendation status for ${title}`,
      }),
      status,
    );
  }

  async updateResourceProgress(resourceTitle: string, status: string) {
    await this.selectOption(
      this.page.getByRole('combobox', {
        name: `Resource progress for ${resourceTitle}`,
      }),
      status,
    );
  }

  async expectRecommendation(title: string) {
    await expect(this.recommendation(title)).toBeVisible();
  }

  async expectStatus(title: string, status: string) {
    await expect(
      this.recommendation(title).getByText(status, { exact: true }).first(),
    ).toBeVisible();
  }
}
