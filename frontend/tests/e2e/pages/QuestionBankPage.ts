import { expect, type Locator, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export type QuestionType = 'SINGLE_CHOICE' | 'TRUE_FALSE';

export interface QuestionOption {
  text: string;
  correct?: boolean;
}

export interface QuestionForm {
  skill: string;
  question: string;
  questionType?: QuestionType;
  level?: 1 | 2 | 3;
  status?: 'ACTIVE' | 'INACTIVE';
  explanation?: string;
  options?: QuestionOption[];
}

export interface QuestionFilters {
  skill?: string;
  skillType?: 'COMMON' | 'CAREER_SPECIFIC';
  level?: 'Level 1' | 'Level 2' | 'Level 3';
  questionType?: QuestionType;
  status?: 'ACTIVE' | 'INACTIVE';
}

export class QuestionBankPage extends PageObject {
  static readonly route = '/admin/assessment-questions';

  readonly title;
  readonly searchInput;
  readonly addButton;

  constructor(page: Page) {
    super(page);
    this.title = this.heading('Assessment Question Bank');
    this.searchInput = page.getByPlaceholder('Search');
    this.addButton = page.getByRole('button', { name: /Add$/ });
  }

  async goto() {
    await this.page.goto(QuestionBankPage.route);
  }

  async expectLoaded() {
    await this.expectPath(QuestionBankPage.route);
    await expect(this.title).toBeVisible();
    await expect(this.searchInput).toBeVisible();
    await expect(this.page.getByRole('table')).toBeVisible();
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }

  async filter(values: QuestionFilters) {
    if (values.skill) {
      await this.selectOption(
        this.page.getByRole('combobox', { name: 'Skill filter' }),
        values.skill,
      );
    }
    if (values.skillType) {
      await this.selectOption(
        this.page.getByRole('combobox', { name: 'Skill Type filter' }),
        values.skillType,
      );
    }
    if (values.level) {
      await this.selectOption(
        this.page.getByRole('combobox', { name: 'Level filter' }),
        values.level,
      );
    }
    if (values.questionType) {
      await this.selectOption(
        this.page.getByRole('combobox', { name: 'Question Type filter' }),
        values.questionType,
      );
    }
    if (values.status) {
      await this.selectOption(
        this.page.getByRole('combobox', { name: 'Status filter' }),
        values.status,
      );
    }
  }

  questionRow(question: string) {
    return this.tableRow(question);
  }

  async openCreateForm() {
    await this.addButton.click();
    return this.dialog('Add Question');
  }

  async openEditForm(question: string) {
    await this.questionRow(question).getByRole('button', { name: 'Edit' }).click();
    return this.dialog('Edit Question');
  }

  async fillForm(dialog: Locator, values: QuestionForm) {
    await this.selectOption(
      dialog.getByRole('combobox', { name: /Skill$/ }),
      values.skill,
    );
    await dialog.getByRole('textbox', { name: /Question$/ }).fill(values.question);
    if (values.questionType) {
      await this.selectOption(
        dialog.getByRole('combobox', { name: /Question Type$/ }),
        values.questionType,
      );
    }
    if (values.level) {
      await dialog.getByRole('spinbutton', { name: /Level$/ }).fill(String(values.level));
    }
    if (values.status) {
      await this.selectOption(
        dialog.getByRole('combobox', { name: /Status$/ }),
        values.status,
      );
    }
    if (values.explanation !== undefined) {
      await dialog
        .getByLabel('Explanation', { exact: true })
        .fill(values.explanation);
    }
    if (values.options) await this.fillOptions(dialog, values.options);
  }

  async save(dialog: Locator) {
    await dialog.getByRole('button', { name: 'OK' }).click();
    await this.expectMessage('Saved');
  }

  async create(values: QuestionForm) {
    const dialog = await this.openCreateForm();
    await this.fillForm(dialog, values);
    await this.save(dialog);
  }

  async update(question: string, values: QuestionForm) {
    const dialog = await this.openEditForm(question);
    await this.fillForm(dialog, values);
    await this.save(dialog);
  }

  async expectRequiredValidation(dialog: Locator) {
    await dialog.getByRole('button', { name: 'OK' }).click();
    await expect(dialog.getByText(/Please (?:enter|select)|required/i).first()).toBeVisible();
  }

  async cancelDialog(dialog: Locator) {
    await dialog.getByRole('button', { name: 'Cancel' }).click();
  }

  async delete(question: string) {
    await this.questionRow(question)
      .getByRole('button', { name: 'Delete' })
      .click();
    await this.expectMessage('Deleted');
  }

  async expectQuestion(question: string) {
    await expect(this.questionRow(question)).toBeVisible();
  }

  async expectQuestionStatus(
    question: string,
    status: 'ACTIVE' | 'INACTIVE',
  ) {
    await expect(
      this.questionRow(question).getByText(status, { exact: true }),
    ).toBeVisible();
  }

  private async fillOptions(dialog: Locator, options: QuestionOption[]) {
    while (
      (await dialog.getByRole('checkbox', { name: /Option \d+ correct/ }).count()) <
      options.length
    ) {
      await dialog.getByRole('button', { name: 'Add Option' }).click();
    }

    const checkboxes = await dialog
      .getByRole('checkbox', { name: /Option \d+ correct/ })
      .all();
    for (const checkbox of checkboxes) await checkbox.uncheck();

    for (const [index, option] of options.entries()) {
      await dialog.getByPlaceholder(`Option ${index + 1}`).fill(option.text);
      if (option.correct) {
        await dialog
          .getByRole('checkbox', { name: `Option ${index + 1} correct` })
          .check();
      }
    }
  }
}
