import { expect, type Page } from '@playwright/test';
import { PageObject } from './PageObject';

export class RoadmapPage extends PageObject {
  static readonly route = '/student/roadmap';

  readonly title;
  readonly generateButton;

  constructor(page: Page) {
    super(page);
    this.title = this.heading('Roadmap');
    this.generateButton = page.getByRole('button', {
      name: 'Generate roadmap from toolbar',
    });
  }

  async goto() {
    await this.page.goto(RoadmapPage.route);
  }

  async expectLoaded() {
    await this.expectPath(RoadmapPage.route);
    await expect(this.title).toBeVisible();
    await expect(this.generateButton).toBeVisible();
  }

  async generate(excludedSuggestionTitles: string[] = []) {
    await this.generateButton.click();

    const review = this.dialog('Review suggestions');
    await expect(review).toBeVisible();
    for (const title of excludedSuggestionTitles) {
      await review
        .getByRole('checkbox', {
          name: `Include suggestion ${title}`,
        })
        .uncheck();
    }
    await review
      .getByRole('button', { name: 'Generate roadmap', exact: true })
      .click();
    await this.expectMessage('Roadmap generated');
    await expect(review).toBeHidden();
  }

  async updateItemStatus(itemTitle: string, status: string, note?: string) {
    await this.selectOption(
      this.page.getByRole('combobox', {
        name: `Roadmap item status for ${itemTitle}`,
      }),
      status,
    );

    if (note !== undefined) {
      const confirmation = this.dialog('Move item back to in progress?');
      await confirmation.getByPlaceholder('Reason').fill(note);
      await confirmation.getByRole('button', { name: 'Update' }).click();
    }
  }

  async updateResourceProgress(resourceTitle: string, status: string) {
    await this.selectOption(
      this.page.getByRole('combobox', {
        name: `Resource progress for ${resourceTitle}`,
      }),
      status,
    );
  }

  roadmapItem(title: string) {
    return this.page.getByTestId('roadmap-item').filter({ hasText: title });
  }

  async expectItem(
    title: string,
    values: { status?: string; phase?: string; order?: number } = {},
  ) {
    const item = this.roadmapItem(title);
    await expect(item).toBeVisible();
    if (values.status) {
      await expect(
        item.getByText(values.status, { exact: true }).first(),
      ).toBeVisible();
    }
    if (values.phase) {
      await expect(item.getByText(values.phase, { exact: true })).toBeVisible();
    }
    if (values.order !== undefined) {
      await expect(item).toContainText(`${values.order}. ${title}`);
    }
  }

  async expectProgress(percent: number) {
    await expect(this.page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      String(percent),
    );
  }

  async expectHistory(title: string, status: string, progress: number) {
    const row = this.page
      .getByRole('table')
      .getByRole('row')
      .filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(row.getByText(status, { exact: true })).toBeVisible();
    await expect(row.getByText(`${progress}%`, { exact: true })).toBeVisible();
  }
}
