import { expect, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export interface StudentProfileForm {
  careerGoal?: string;
  specialization?: string;
  summary?: string;
  githubURL?: string;
  linkedinURL?: string;
  portfolioURL?: string;
}

export class StudentProfilePage extends PageObject {
  static readonly route = '/student/profile';

  readonly title;
  readonly careerGoalSelect;
  readonly specializationSelect;
  readonly summaryInput;
  readonly githubInput;
  readonly linkedinInput;
  readonly portfolioInput;
  readonly saveButton;

  constructor(page: Page) {
    super(page);
    this.title = this.heading('Profile');
    this.careerGoalSelect = page.getByRole('combobox', { name: 'Career Goal' });
    this.specializationSelect = page.getByRole('combobox', {
      name: 'Specialization',
    });
    this.summaryInput = page.getByLabel('Summary');
    this.githubInput = page.getByLabel('GitHub URL');
    this.linkedinInput = page.getByLabel('LinkedIn URL');
    this.portfolioInput = page.getByLabel('Portfolio URL');
    this.saveButton = page.getByRole('button', { name: 'Save Profile' });
  }

  async goto() {
    await this.page.goto(StudentProfilePage.route);
  }

  async expectLoaded() {
    await this.expectPath(StudentProfilePage.route);
    await expect(this.title).toBeVisible();
    await expect(this.careerGoalSelect).toBeVisible();
    await expect(this.summaryInput).toBeVisible();
    await expect(this.saveButton).toBeVisible();
  }

  async fillForm(values: StudentProfileForm) {
    if (values.careerGoal) {
      await this.selectOption(this.careerGoalSelect, values.careerGoal);
    }
    if (values.specialization) {
      await expect(this.specializationSelect).toBeVisible();
      await this.selectOption(this.specializationSelect, values.specialization);
    }
    if (values.summary !== undefined) await this.summaryInput.fill(values.summary);
    if (values.githubURL !== undefined) await this.githubInput.fill(values.githubURL);
    if (values.linkedinURL !== undefined) {
      await this.linkedinInput.fill(values.linkedinURL);
    }
    if (values.portfolioURL !== undefined) {
      await this.portfolioInput.fill(values.portfolioURL);
    }
  }

  async save({ confirmContextChange = true } = {}) {
    await this.saveButton.click();

    const confirmation = this.dialog('Change profile context?');
    try {
      await confirmation.waitFor({ state: 'visible', timeout: 1_000 });
      if (confirmContextChange) {
        await confirmation
          .getByRole('button', { name: 'Update profile' })
          .click();
      }
    } catch {
      // Saving without changing the career scope does not open a confirmation.
    }

    if (confirmContextChange) await this.expectMessage('Profile updated');
  }

  async expectValues(values: StudentProfileForm) {
    if (values.summary !== undefined) {
      await expect(this.summaryInput).toHaveValue(values.summary);
    }
    if (values.githubURL !== undefined) {
      await expect(this.githubInput).toHaveValue(values.githubURL);
    }
    if (values.linkedinURL !== undefined) {
      await expect(this.linkedinInput).toHaveValue(values.linkedinURL);
    }
    if (values.portfolioURL !== undefined) {
      await expect(this.portfolioInput).toHaveValue(values.portfolioURL);
    }
  }
}
