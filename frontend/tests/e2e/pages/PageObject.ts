import { expect, type Locator, type Page } from '@playwright/test';

export abstract class PageObject {
  protected constructor(public readonly page: Page) {}

  protected heading(name: string) {
    return this.page.getByRole('heading', { name, exact: true });
  }

  protected dialog(name: string | RegExp) {
    return this.page.getByRole('dialog', { name });
  }

  protected tableRow(text: string) {
    return this.page
      .getByRole('row')
      .filter({ has: this.page.getByText(text, { exact: true }) });
  }

  protected listItem(text: string) {
    return this.page
      .getByRole('listitem')
      .filter({ has: this.page.getByText(text, { exact: true }) });
  }

  protected async selectOption(control: Locator, option: string) {
    const select = control.locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]',
    );
    const selectedOption = select.locator('.ant-select-selection-item');
    if ((await selectedOption.count()) > 0) {
      const current = selectedOption.first();
      const selectedValue =
        (await current.getAttribute('title')) ??
        (await current.textContent())?.trim();
      if (selectedValue === option) return;
    }

    // Ant Design renders the selected value above its readonly combobox input,
    // so keyboard opening avoids pointer interception by that presentation layer.
    await control.press('ArrowDown');
    // Link the combobox to its own popup. Multiple Ant Design popups can coexist
    // briefly during animations, so selecting the globally last popup is racy.
    const popupId =
      (await control.getAttribute('aria-controls')) ??
      (await control.getAttribute('aria-owns'));
    const popup = popupId
      ? this.page
          .locator('.ant-select-dropdown')
          .filter({ has: this.page.locator(`[id="${popupId}"]`) })
      : this.page.locator('.ant-select-dropdown:visible').last();
    await popup
      .getByTitle(option, { exact: true })
      .last()
      .click();
  }

  protected async expectPath(pathname: string) {
    await expect(this.page).toHaveURL((url) => url.pathname === pathname);
  }

  protected async expectMessage(message: string) {
    await expect(
      this.page.getByText(message, { exact: true }).last(),
    ).toBeVisible();
  }
}
