import { expect, type Locator, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export type StudentResourceKind =
  | 'skills'
  | 'projects'
  | 'certificates'
  | 'activities'
  | 'experiences';

const resourceConfig: Record<
  StudentResourceKind,
  { title: string; itemLabel: string }
> = {
  skills: { title: 'Skills', itemLabel: 'Skill' },
  projects: { title: 'Projects', itemLabel: 'Project' },
  certificates: { title: 'Certificates', itemLabel: 'Certificate' },
  activities: { title: 'Activities', itemLabel: 'Activity' },
  experiences: { title: 'Experiences', itemLabel: 'Experience' },
};

export class StudentResourcePage extends PageObject {
  readonly route: string;
  readonly title;
  readonly addForm;

  constructor(page: Page, public readonly kind: StudentResourceKind) {
    super(page);
    this.route = `/student/${kind}`;
    this.title = this.heading(resourceConfig[kind].title);
    this.addForm = page.getByRole('main').locator('form').first();
  }

  async goto() {
    await this.page.goto(this.route);
  }

  async expectLoaded() {
    await this.expectPath(this.route);
    await expect(this.title).toBeVisible();
    await expect(this.addForm).toBeVisible();
    await expect(this.page.getByRole('table')).toBeVisible();
  }

  resourceRow(name: string) {
    return this.tableRow(name);
  }

  async add({
    fields = {},
    selects = {},
  }: {
    fields?: Record<string, string>;
    selects?: Record<string, string>;
  }) {
    await this.fillForm(this.addForm, fields, selects);
    await this.addForm.getByRole('button', { name: 'Add', exact: true }).click();
    await this.expectMessage('Saved');
  }

  async edit(name: string, fields: Record<string, string>) {
    await this.resourceRow(name).getByRole('button', { name: 'Edit' }).click();
    const dialog = this.dialog(`Edit ${resourceConfig[this.kind].itemLabel}`);
    await this.fillForm(dialog, fields, {});
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await this.expectMessage('Updated');
  }

  async uploadEvidence(name: string, evidenceUrl: string, note: string) {
    await this.resourceRow(name).getByRole('button', { name: 'Upload' }).click();
    const dialog = this.dialog('Upload evidence');
    await dialog.getByPlaceholder('https://...').fill(evidenceUrl);
    await dialog.getByRole('textbox', { name: 'Note' }).fill(note);
    await dialog.getByRole('button', { name: 'Upload', exact: true }).click();
    await this.expectMessage('Evidence uploaded and pending review');
  }

  async expectResource(name: string) {
    await expect(this.resourceRow(name)).toBeVisible();
  }

  async expectVerification(name: string, status: string) {
    await expect(
      this.resourceRow(name).getByText(status, { exact: true }),
    ).toBeVisible();
  }

  private async fillForm(
    form: Locator,
    fields: Record<string, string>,
    selects: Record<string, string>,
  ) {
    for (const [label, value] of Object.entries(fields)) {
      await form
        .getByRole('textbox', { name: new RegExp(`${escapeRegExp(label)}$`) })
        .fill(value);
    }
    for (const [label, value] of Object.entries(selects)) {
      await this.selectOption(
        form.getByRole('combobox', {
          name: new RegExp(`${escapeRegExp(label)}$`),
        }),
        value,
      );
    }
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
