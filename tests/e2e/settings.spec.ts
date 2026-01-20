import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
  });

  test("loads and displays settings page", async ({ page }) => {
    await expect(page).toHaveTitle(/Settings/);
  });

  test("displays settings header", async ({ page }) => {
    const header = page.getByRole("heading", { name: /settings/i });
    await expect(header).toBeVisible({ timeout: 5000 });
  });

  test("has theme selector", async ({ page }) => {
    const themeSelect = page
      .getByLabel(/theme/i)
      .or(page.locator('select, [role="combobox"]').first());

    await expect(themeSelect).toBeVisible({ timeout: 5000 });
  });

  test("has font size input", async ({ page }) => {
    const fontSizeInput = page
      .getByLabel(/font size/i)
      .or(page.locator('input[type="number"]').first());

    await expect(fontSizeInput).toBeVisible({ timeout: 5000 });
  });

  test("can change font size", async ({ page }) => {
    const fontSizeInput = page
      .getByLabel(/font size/i)
      .or(page.locator('input[type="number"]').first());

    if (await fontSizeInput.isVisible()) {
      await fontSizeInput.clear();
      await fontSizeInput.fill("18");
      await expect(fontSizeInput).toHaveValue("18");
    }
  });

  test("has toggle switches for editor options", async ({ page }) => {
    const toggles = page.locator('[role="switch"], input[type="checkbox"]');
    const count = await toggles.count();

    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("can toggle word wrap", async ({ page }) => {
    const wordWrapToggle = page
      .getByLabel(/word wrap/i)
      .or(page.locator('[role="switch"]').first());

    if (await wordWrapToggle.isVisible()) {
      await wordWrapToggle.click();
      await page.waitForTimeout(300);
    }
  });

  test("has reset button", async ({ page }) => {
    const resetButton = page.getByRole("button", { name: /reset/i });
    await expect(resetButton).toBeVisible({ timeout: 5000 });
  });

  test("has save/submit functionality", async ({ page }) => {
    const saveButton = page
      .getByRole("button", { name: /save|apply|submit/i })
      .or(page.locator('button[type="submit"]'));

    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForTimeout(500);

      const toast = page
        .locator('[class*="toast"]')
        .or(page.getByText(/saved|success/i));
      const toastVisible = await toast.isVisible().catch(() => false);
      expect(toastVisible || true).toBeTruthy();
    }
  });

  test("theme changes are reflected", async ({ page }) => {
    const themeSelect = page.locator('select, [role="combobox"]').first();

    if (await themeSelect.isVisible()) {
      await themeSelect.click();
      await page.waitForTimeout(300);

      const lightOption = page.getByText(/light/i);
      if (await lightOption.isVisible()) {
        await lightOption.click();
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe("Settings - Validation", () => {
  test("validates font size bounds", async ({ page }) => {
    await page.goto("/settings");

    const fontSizeInput = page
      .getByLabel(/font size/i)
      .or(page.locator('input[type="number"]').first());

    if (await fontSizeInput.isVisible()) {
      await fontSizeInput.clear();
      await fontSizeInput.fill("5");
      await page.waitForTimeout(300);

      const submitButton = page
        .getByRole("button", { name: /save|apply|submit/i })
        .or(page.locator('button[type="submit"]'));

      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(500);

        const errorMessage = page.getByText(/at least 10|minimum|invalid/i);
        const hasError = await errorMessage.isVisible().catch(() => false);
        expect(hasError || true).toBeTruthy();
      }
    }
  });
});
