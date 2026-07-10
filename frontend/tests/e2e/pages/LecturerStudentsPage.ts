import { expect, type Locator, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export interface LecturerStudentSeed {
  fullName: string;
  email: string;
  studentCode: string;
  className?: string | null;
  careerGoalName?: string;
  summary?: string;
}

export class LecturerStudentsPage extends PageObject {
  static readonly route = '/lecturer/students';

  readonly title;
  readonly searchInput;
  readonly searchButton;

  constructor(page: Page) {
    super(page);
    this.title = this.heading('Assigned Students');
    this.searchInput = page.getByPlaceholder('Name, email, or student code');
    this.searchButton = page.getByRole('button', { name: 'Search' });
  }

  async goto() {
    await this.page.goto(LecturerStudentsPage.route);
  }

  async expectLoaded() {
    await this.expectPath(LecturerStudentsPage.route);
    await expect(this.title).toBeVisible();
    await expect(this.page.getByRole('table')).toBeVisible();
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.searchButton.click();
  }

  async expectStudentVisible(fullName: string) {
    await expect(this.studentRow(fullName)).toBeVisible();
  }

  async expectStudentNotVisible(fullName: string) {
    await expect(this.studentRow(fullName)).toHaveCount(0);
  }

  async openStudentDetails(fullName: string) {
    await this.studentRow(fullName).getByRole('button', { name: 'View' }).click();
    await expect(this.detailDrawer()).toBeVisible();
  }

  async expectOverview(student: LecturerStudentSeed) {
    const drawer = this.detailDrawer();
    await expect(drawer.getByRole('heading', { name: student.fullName })).toBeVisible();
    await expect(drawer.getByText(student.email, { exact: true })).toBeVisible();
    await expect(drawer.getByText(student.studentCode, { exact: true })).toBeVisible();
    if (student.careerGoalName) {
      await expect(drawer.getByText(student.careerGoalName, { exact: true })).toBeVisible();
    }
    if (student.summary) {
      await expect(drawer.getByText(student.summary, { exact: true })).toBeVisible();
    }
  }

  async expectAnalysisMetrics() {
    const drawer = this.detailDrawer();
    await expect(drawer.getByText('Completion', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Career match', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Risk score', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Last analyzed', { exact: true })).toBeVisible();
  }

  async openTab(name: 'Skills' | 'Projects' | 'Certificates' | 'Activities' | 'Experiences') {
    await this.detailDrawer().getByRole('tab', { name }).click();
    await expect(
      this.detailDrawer().getByRole('tabpanel').getByRole('table'),
    ).toBeVisible();
  }

  async expectResource(tab: Parameters<LecturerStudentsPage['openTab']>[0], text: string, status?: string) {
    await this.openTab(tab);
    const row = this.detailRow(text);
    await expect(row).toBeVisible();
    if (status) {
      await expect(row.getByText(status, { exact: true })).toBeVisible();
    }
  }

  async closeDetails() {
    await this.detailDrawer().getByRole('button', { name: 'Close' }).click();
    await expect(this.detailDrawer()).toBeHidden();
  }

  detailDrawer() {
    return this.page.getByRole('dialog', { name: 'Assigned student details' });
  }

  private studentRow(fullName: string) {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByText(fullName, { exact: true }) });
  }

  private detailRow(text: string): Locator {
    return this.detailDrawer()
      .getByRole('row')
      .filter({ has: this.page.getByText(text, { exact: true }) });
  }

}
