import { expect, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export class AdminDashboardPage extends PageObject {
  static readonly route = '/admin/dashboard';

  readonly title;
  readonly totalStudentsMetric;
  readonly totalLecturersMetric;
  readonly topMissingSkills;
  readonly topCareerGoals;

  constructor(page: Page) {
    super(page);
    this.title = this.heading('Admin Dashboard');
    this.totalStudentsMetric = page.getByText('Total Students', { exact: true });
    this.totalLecturersMetric = page.getByText('Total Lecturers', {
      exact: true,
    });
    this.topMissingSkills = page.getByText('Top Missing Skills', { exact: true });
    this.topCareerGoals = page.getByText('Top Career Goals', { exact: true });
  }

  async goto() {
    await this.page.goto(AdminDashboardPage.route);
  }

  async expectLoaded() {
    await this.expectPath(AdminDashboardPage.route);
    await expect(this.title).toBeVisible();
    await expect(this.totalStudentsMetric).toBeVisible();
    await expect(this.totalLecturersMetric).toBeVisible();
  }

  async goToQuestionBank() {
    await this.page.getByRole('menuitem', { name: 'Question Bank' }).click();
    await this.expectPath('/admin/assessment-questions');
  }
}
