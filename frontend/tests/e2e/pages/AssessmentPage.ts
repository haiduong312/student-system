import { expect, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export class AssessmentPage extends PageObject {
  static readonly route = '/student/assessment';

  readonly startTitle;
  readonly quizTitle;
  readonly resultTitle;
  readonly startButton;
  readonly submitButton;

  constructor(page: Page) {
    super(page);
    this.startTitle = this.heading('Assessment');
    this.quizTitle = this.heading('Assessment Quiz');
    this.resultTitle = this.heading('Assessment Result');
    this.startButton = page.getByTestId('assessment-start-button');
    this.submitButton = page.getByTestId('assessment-submit-button');
  }

  async goto() {
    await this.page.goto(AssessmentPage.route);
  }

  async expectLoaded() {
    await this.expectPath(AssessmentPage.route);
    await expect(this.startTitle).toBeVisible();
    await expect(this.startButton).toBeVisible();
  }

  async start() {
    await this.startButton.click();
    await expect(this.quizTitle).toBeVisible();
  }

  async expectContext(careerGoalName: string, specializationName = 'General') {
    await expect(this.page.getByText(careerGoalName, { exact: true })).toBeVisible();
    await expect(
      this.page.getByText(specializationName, { exact: true }),
    ).toBeVisible();
  }

  async expectInProgress(questionCount: number) {
    await expect(this.page.getByText('IN_PROGRESS', { exact: true })).toBeVisible();
    await expect(this.page.getByRole('group', { name: /^Question \d+:/ })).toHaveCount(
      Math.min(questionCount, 20),
    );
  }

  async expectSubmitDisabled() {
    await expect(this.submitButton).toBeDisabled();
  }

  async answerQuestion(questionText: string, optionText: string) {
    const escapedQuestion = escapeRegExp(questionText);
    const question = this.page.getByRole('group', {
      name: new RegExp(`^Question \\d+: ${escapedQuestion}$`),
    });
    await question.getByRole('radio', { name: optionText, exact: true }).check();
  }

  async submit() {
    await this.submitButton.click();
    const confirmation = this.dialog('Submit assessment?');
    await confirmation.getByRole('button', { name: 'Submit', exact: true }).click();
    await this.expectResult();
  }

  async expectResult() {
    await expect(this.resultTitle).toBeVisible();
    await expect(this.page.getByRole('table')).toBeVisible();
  }

  async expectSkillResult(skillName: string) {
    await expect(
      this.page.getByRole('row').filter({ hasText: skillName }),
    ).toBeVisible();
  }

  async expectStartError(message: string | RegExp) {
    await expect(this.page.getByText(message).last()).toBeVisible();
    await expect(this.startTitle).toBeVisible();
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
