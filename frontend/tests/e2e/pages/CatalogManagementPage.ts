import { expect, type Locator, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export type CatalogKind = 'skill-categories' | 'skills' | 'career-goals';

export interface CatalogForm {
  name: string;
  description?: string;
  type?: 'COMMON' | 'CAREER_SPECIFIC';
  category?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface SpecializationForm {
  name: string;
  description?: string;
  active?: boolean;
}

export interface RequiredSkillForm {
  skill: string;
  requiredLevel?: 1 | 2 | 3;
  weight?: number;
  learningOrder?: number;
  roadmapPhase?:
    | 'Core Foundation'
    | 'Career Track'
    | 'Specialization'
    | 'Practice Project'
    | 'Portfolio Preparation';
}

const catalogTitles: Record<CatalogKind, string> = {
  'skill-categories': 'Skill Categories',
  skills: 'Skills',
  'career-goals': 'Career Goals',
};

export class CatalogManagementPage extends PageObject {
  readonly route: string;
  readonly catalogTitle: string;
  readonly title;
  readonly searchInput;
  readonly addButton;

  constructor(page: Page, public readonly kind: CatalogKind) {
    super(page);
    this.route = `/admin/${kind}`;
    this.catalogTitle = catalogTitles[kind];
    this.title = this.heading(this.catalogTitle);
    this.searchInput = page.getByPlaceholder('Search');
    this.addButton = page.getByRole('button', { name: /Add$/ });
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

  recordRow(name: string) {
    return this.tableRow(name);
  }

  async openCreateForm() {
    await this.addButton.click();
    return this.catalogDialog('Add');
  }

  async openEditForm(name: string) {
    await this.recordRow(name).getByRole('button', { name: 'Edit' }).click();
    return this.catalogDialog('Edit');
  }

  async fillForm(dialog: Locator, values: CatalogForm) {
    await dialog.getByLabel('Name').fill(values.name);
    if (values.description !== undefined) {
      await dialog.getByLabel('Description').fill(values.description);
    }
    if (values.type) {
      await this.selectOption(
        dialog.getByRole('combobox', { name: 'Type' }),
        values.type,
      );
    }
    if (values.category) {
      await this.selectOption(
        dialog.getByRole('combobox', { name: 'Category' }),
        values.category,
      );
    }
    if (values.status) {
      await this.selectOption(
        dialog.getByRole('combobox', { name: 'Status' }),
        values.status,
      );
    }
  }

  async save(dialog: Locator) {
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await this.expectMessage('Saved');
  }

  async create(values: CatalogForm) {
    const dialog = await this.openCreateForm();
    await this.fillForm(dialog, values);
    await this.save(dialog);
  }

  async update(name: string, values: CatalogForm) {
    const dialog = await this.openEditForm(name);
    await this.fillForm(dialog, values);
    await this.save(dialog);
  }

  async expectRequiredFieldValidation(dialog: Locator, field = 'Name') {
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(
      dialog.getByText(
        new RegExp(`(?:Please (?:enter|select)\\s+${field})|(?:${field}.*required)`, 'i'),
      ),
    ).toBeVisible();
  }

  async cancelDialog(dialog: Locator) {
    await dialog.getByRole('button', { name: 'Cancel' }).click();
  }

  async delete(name: string) {
    await this.recordRow(name).getByRole('button', { name: 'Delete' }).click();
    await this.expectMessage('Deleted');
  }

  async manageCareerGoal(name: string) {
    await this.recordRow(name).getByRole('button', { name: 'Manage' }).click();
    const drawer = this.dialog(name);
    await expect(drawer.getByRole('tab', { name: 'Overview' })).toBeVisible();
    return drawer;
  }

  async expectRecord(name: string) {
    await expect(this.recordRow(name)).toBeVisible();
  }

  async expectRecordStatus(name: string, status: 'ACTIVE' | 'INACTIVE') {
    await expect(
      this.recordRow(name).getByText(status, { exact: true }),
    ).toBeVisible();
  }

  async openCareerGoalTab(
    careerGoalName: string,
    tab: 'Required Skills' | 'Specializations',
  ) {
    const drawer = this.dialog(careerGoalName);
    await drawer.getByRole('tab', { name: tab, exact: true }).click();
    return drawer;
  }

  async createSpecialization(
    careerGoalName: string,
    values: SpecializationForm,
  ) {
    const drawer = await this.openCareerGoalTab(
      careerGoalName,
      'Specializations',
    );
    await drawer
      .getByRole('button', { name: 'Create Specialization' })
      .click();
    const modal = this.dialog('Create Specialization');
    await this.fillSpecializationForm(modal, values);
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    await this.expectMessage('Saved');
  }

  async updateSpecialization(
    careerGoalName: string,
    currentName: string,
    values: SpecializationForm,
  ) {
    const drawer = await this.openCareerGoalTab(
      careerGoalName,
      'Specializations',
    );
    await this.rowWithin(drawer, currentName)
      .getByRole('button', { name: 'Edit' })
      .click();
    const modal = this.dialog('Edit Specialization');
    await this.fillSpecializationForm(modal, values);
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    await this.expectMessage('Saved');
  }

  async deactivateSpecialization(
    careerGoalName: string,
    specializationName: string,
  ) {
    const drawer = await this.openCareerGoalTab(
      careerGoalName,
      'Specializations',
    );
    await this.rowWithin(drawer, specializationName)
      .getByRole('button', { name: 'Deactivate' })
      .click();
    await this.expectMessage('Deactivated');
  }

  async expectSpecialization(
    careerGoalName: string,
    specializationName: string,
    status?: 'ACTIVE' | 'INACTIVE',
  ) {
    const drawer = await this.openCareerGoalTab(
      careerGoalName,
      'Specializations',
    );
    const row = this.rowWithin(drawer, specializationName);
    await expect(row).toBeVisible();
    if (status) await expect(row.getByText(status, { exact: true })).toBeVisible();
  }

  async createRequiredSkill(
    careerGoalName: string,
    values: RequiredSkillForm,
  ) {
    const drawer = await this.openCareerGoalTab(
      careerGoalName,
      'Required Skills',
    );
    await drawer.getByRole('button', { name: 'Add Skill' }).click();
    const modal = this.dialog('Add Required Skill');
    await this.fillRequiredSkillForm(modal, values);
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    await this.expectMessage('Saved');
  }

  async updateRequiredSkill(
    careerGoalName: string,
    skillName: string,
    values: Omit<RequiredSkillForm, 'skill'>,
  ) {
    const drawer = await this.openCareerGoalTab(
      careerGoalName,
      'Required Skills',
    );
    await this.rowWithin(drawer, skillName)
      .getByRole('button', { name: 'Edit' })
      .click();
    const modal = this.dialog('Edit Required Skill');
    await this.fillRequiredSkillForm(modal, { skill: skillName, ...values });
    await modal.getByRole('button', { name: 'Save', exact: true }).click();
    await this.expectMessage('Saved');
  }

  async deleteRequiredSkill(careerGoalName: string, skillName: string) {
    const drawer = await this.openCareerGoalTab(
      careerGoalName,
      'Required Skills',
    );
    await this.rowWithin(drawer, skillName)
      .getByRole('button', { name: 'Delete' })
      .click();
    await this.expectMessage('Deleted');
  }

  async expectRequiredSkill(careerGoalName: string, skillName: string) {
    const drawer = await this.openCareerGoalTab(
      careerGoalName,
      'Required Skills',
    );
    await expect(this.rowWithin(drawer, skillName)).toBeVisible();
  }

  async expectRequiredSkillValues(
    careerGoalName: string,
    skillName: string,
    values: { learningOrder?: number; roadmapPhase?: string },
  ) {
    const drawer = await this.openCareerGoalTab(
      careerGoalName,
      'Required Skills',
    );
    const row = this.rowWithin(drawer, skillName);
    if (values.learningOrder !== undefined) {
      await expect(
        row.getByText(String(values.learningOrder), { exact: true }),
      ).toBeVisible();
    }
    if (values.roadmapPhase) {
      await expect(row.getByText(values.roadmapPhase, { exact: true })).toBeVisible();
    }
  }

  async expectRequiredSkillMissing(
    careerGoalName: string,
    skillName: string,
  ) {
    const drawer = await this.openCareerGoalTab(
      careerGoalName,
      'Required Skills',
    );
    await expect(this.rowWithin(drawer, skillName)).toHaveCount(0);
  }

  private catalogDialog(action: 'Add' | 'Edit') {
    return this.dialog(`${action} ${this.catalogTitle}`);
  }

  private rowWithin(container: Locator, text: string) {
    return container.getByRole('row').filter({ hasText: text });
  }

  private async fillSpecializationForm(
    modal: Locator,
    values: SpecializationForm,
  ) {
    await modal.getByLabel('Name').fill(values.name);
    if (values.description !== undefined) {
      await modal.getByLabel('Description').fill(values.description);
    }
    if (values.active !== undefined) {
      const activeSwitch = modal.getByRole('switch', { name: 'Active' });
      const checked = (await activeSwitch.getAttribute('aria-checked')) === 'true';
      if (checked !== values.active) await activeSwitch.click();
    }
  }

  private async fillRequiredSkillForm(
    modal: Locator,
    values: RequiredSkillForm,
  ) {
    const skillSelect = modal.getByRole('combobox', { name: 'Skill' });
    if (await skillSelect.isEnabled()) {
      await this.selectOption(skillSelect, values.skill);
    }
    if (values.requiredLevel !== undefined) {
      await modal.getByLabel('Required Level').fill(String(values.requiredLevel));
    }
    if (values.weight !== undefined) {
      await modal.getByLabel('Weight').fill(String(values.weight));
    }
    if (values.learningOrder !== undefined) {
      await modal.getByLabel('Learning Order').fill(String(values.learningOrder));
    }
    if (values.roadmapPhase) {
      await this.selectOption(
        modal.getByRole('combobox', { name: 'Roadmap Phase' }),
        values.roadmapPhase,
      );
    }
  }
}
