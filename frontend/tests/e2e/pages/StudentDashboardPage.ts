import { expect, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export class StudentDashboardPage extends PageObject {
  static readonly route = '/student/dashboard';

  readonly title;
  readonly completionMetric;
  readonly careerMatchMetric;
  readonly roadmapProgressMetric;
  readonly updateProfileLink;
  readonly assessmentLink;
  readonly analysisLink;

  constructor(page: Page) {
    super(page);
    this.title = this.heading('Student Dashboard');
    this.completionMetric = page.getByText('Completion', { exact: true });
    this.careerMatchMetric = page.getByText('Career Match', { exact: true });
    this.roadmapProgressMetric = page.getByText('Roadmap Progress', {
      exact: true,
    });
    this.updateProfileLink = page.getByRole('link', { name: 'Update Profile' });
    this.assessmentLink = page.getByRole('link', { name: 'Do Assessment' });
    this.analysisLink = page.getByRole('link', { name: 'Analyze Now' });
  }

  async goto() {
    await this.page.goto(StudentDashboardPage.route);
  }

  async expectLoaded() {
    await this.expectPath(StudentDashboardPage.route);
    await expect(this.title).toBeVisible();
    await expect(this.completionMetric).toBeVisible();
    await expect(this.careerMatchMetric).toBeVisible();
    await expect(this.roadmapProgressMetric).toBeVisible();
  }

  async goToProfile() {
    await this.updateProfileLink.click();
  }

  async goToAssessment() {
    await this.assessmentLink.click();
  }

  async goToAnalysis() {
    await this.analysisLink.click();
  }
}
