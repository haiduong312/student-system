import { expect, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export class AnalysisPage extends PageObject {
  static readonly route = '/student/analysis';

  readonly title;
  readonly analyzeButton;

  constructor(page: Page) {
    super(page);
    this.title = this.heading('Competency Analysis');
    this.analyzeButton = page.getByRole('button', { name: 'Analyze Now' });
  }

  async goto() {
    await this.page.goto(AnalysisPage.route);
  }

  async expectLoaded() {
    await this.expectPath(AnalysisPage.route);
    await expect(this.title).toBeVisible();
    await expect(this.analyzeButton).toBeVisible();
  }

  async analyze() {
    await this.analyzeButton.click();
    await this.expectMessage('Analysis completed');
  }

  async expectMetric(label: string, value: string | RegExp) {
    const row = this.page
      .getByRole('row')
      .filter({ has: this.page.getByRole('rowheader', { name: label }) })
      .first();
    await expect(row).toContainText(value);
  }

  async expectSkill(skillName: string, status: string) {
    const row = this.page.getByRole('row').filter({ hasText: skillName });
    await expect(row).toBeVisible();
    await expect(row.getByText(status, { exact: true })).toBeVisible();
  }

  async expectHistoryLifecycle(careerGoal: string) {
    const history = this.page.getByRole('table').last();
    const rows = history.getByRole('row').filter({ hasText: careerGoal });
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: 'CURRENT' })).toHaveCount(1);
    await expect(rows.filter({ hasText: 'OBSOLETE' })).toHaveCount(1);
  }
}
