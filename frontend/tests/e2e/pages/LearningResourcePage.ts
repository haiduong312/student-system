import { expect, type Locator, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export interface LearningResourceForm {
  title: string;
  description?: string;
  type?: string;
  difficulty?: string;
  provider?: string;
  duration?: string;
  language?: string;
  url?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface LearningResourceSkillForm {
  skill: string;
  targetLevel?: 'ZERO' | 'BASIC' | 'INTERMEDIATE' | 'GOOD';
  roadmapPhase?:
    | 'Core Foundation'
    | 'Career Track'
    | 'Specialization'
    | 'Practice Project'
    | 'Portfolio Preparation';
  relevanceScore?: number;
  order?: number;
}

export class LearningResourcePage extends PageObject {
  readonly route = '/admin/learning-resources';
  readonly title;
  readonly searchInput;
  readonly addButton;

  constructor(page: Page) {
    super(page);
    this.title = this.heading('Learning Resources');
    this.searchInput = page.getByPlaceholder('Search');
    this.addButton = page.getByRole('button', { name: 'Add resource' });
  }

  async goto() {
    await this.page.goto(this.route);
  }

  async expectLoaded() {
    await this.expectPath(this.route);
    await expect(this.title).toBeVisible();
    await expect(this.searchInput).toBeVisible();
    await expect(this.page.getByRole('table')).toBeVisible();
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }

  recordRow(title: string) {
    return this.tableRow(title);
  }

  async openCreateForm() {
    await this.addButton.click();
    return this.dialog('Add Learning Resource');
  }

  async create(values: LearningResourceForm) {
    const dialog = await this.openCreateForm();
    await this.fillResourceForm(dialog, values);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await this.expectMessage('Saved');
  }

  async update(currentTitle: string, values: LearningResourceForm) {
    await this.recordRow(currentTitle)
      .getByRole('button', { name: 'Edit' })
      .click();
    const dialog = this.dialog('Edit Learning Resource');
    await this.fillResourceForm(dialog, values);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await this.expectMessage('Saved');
  }

  async expectRequiredValidation(dialog: Locator) {
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog.getByText(/Please enter Title/i)).toBeVisible();
  }

  async cancel(dialog: Locator) {
    await dialog.getByRole('button', { name: 'Cancel' }).click();
  }

  async openDetail(title: string) {
    await this.recordRow(title)
      .getByRole('button', { name: `View learning resource ${title}` })
      .click();
    const drawer = this.dialog(title);
    await expect(drawer).toBeVisible();
    return drawer;
  }

  async linkSkill(drawer: Locator, values: LearningResourceSkillForm) {
    await drawer.getByRole('button', { name: 'Link skill' }).click();
    const dialog = this.dialog('Link Skill');
    await this.fillSkillForm(dialog, values);
    await dialog.getByRole('button', { name: 'Link', exact: true }).click();
    await this.expectMessage('Skill linked');
  }

  async updateSkill(
    drawer: Locator,
    skillName: string,
    values: Omit<LearningResourceSkillForm, 'skill'>,
  ) {
    await this.rowWithin(drawer, skillName)
      .getByRole('button', { name: 'Edit' })
      .click();
    const dialog = this.dialog('Edit Skill Link');
    await this.fillSkillForm(dialog, { ...values, skill: skillName }, true);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await this.expectMessage('Skill link updated');
  }

  async unlinkSkill(drawer: Locator, skillName: string) {
    await this.rowWithin(drawer, skillName)
      .getByRole('button', { name: 'Unlink' })
      .click();
    await this.page
      .locator('.ant-popconfirm:visible')
      .getByRole('button', { name: 'Unlink', exact: true })
      .click();
    await this.expectMessage('Skill unlinked');
  }

  async deactivate(title: string) {
    await this.recordRow(title)
      .getByRole('button', { name: 'Deactivate' })
      .click();
    await this.page
      .locator('.ant-popconfirm:visible')
      .getByRole('button', { name: 'Deactivate', exact: true })
      .click();
    await this.expectMessage('Deactivated');
  }

  async expectRecord(title: string) {
    await expect(this.recordRow(title)).toBeVisible();
  }

  async fillResourceForm(dialog: Locator, values: LearningResourceForm) {
    await dialog.getByLabel('Title').fill(values.title);
    if (values.description !== undefined) {
      await dialog.getByLabel('Description').fill(values.description);
    }
    if (values.type) {
      await this.selectOption(
        dialog.getByRole('combobox', { name: 'Type' }),
        values.type,
      );
    }
    if (values.difficulty) {
      await this.selectOption(
        dialog.getByRole('combobox', { name: 'Difficulty' }),
        values.difficulty,
      );
    }
    if (values.provider !== undefined) {
      await dialog.getByLabel('Provider').fill(values.provider);
    }
    if (values.duration !== undefined) {
      await dialog.getByLabel('Duration').fill(values.duration);
    }
    if (values.language !== undefined) {
      await dialog.getByLabel('Language').fill(values.language);
    }
    if (values.url !== undefined) {
      await dialog.getByLabel('URL').fill(values.url);
    }
    if (values.status) {
      await this.selectOption(
        dialog.getByRole('combobox', { name: 'Status' }),
        values.status,
      );
    }
  }

  private async fillSkillForm(
    dialog: Locator,
    values: LearningResourceSkillForm,
    editing = false,
  ) {
    if (!editing) {
      await this.selectOption(
        dialog.getByRole('combobox', { name: 'Skill' }),
        values.skill,
      );
    }
    if (values.targetLevel) {
      await this.selectOption(
        dialog.getByRole('combobox', { name: 'Target Level' }),
        values.targetLevel,
      );
    }
    if (values.roadmapPhase) {
      await this.selectOption(
        dialog.getByRole('combobox', { name: 'Roadmap Phase' }),
        values.roadmapPhase,
      );
    }
    if (values.relevanceScore !== undefined) {
      await dialog
        .getByRole('spinbutton', { name: 'Relevance Score' })
        .fill(String(values.relevanceScore));
    }
    if (values.order !== undefined) {
      await dialog
        .getByRole('spinbutton', { name: 'Order' })
        .fill(String(values.order));
    }
  }

  private rowWithin(container: Locator, text: string) {
    return container.getByRole('row').filter({ hasText: text });
  }
}
