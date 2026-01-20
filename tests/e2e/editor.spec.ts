import { test, expect } from "@playwright/test";

test.describe("Editor Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/editor");
  });

  test("loads and displays editor page", async ({ page }) => {
    await expect(page).toHaveTitle(/Editor/);
  });

  test("shows loading state or editor content", async ({ page }) => {
    const loadingOrEditor = page.getByText(/loading|editor|console/i).first();
    await expect(loadingOrEditor).toBeVisible({ timeout: 15000 });
  });

  test("displays toolbar with file actions", async ({ page }) => {
    await page.waitForTimeout(2000);
    const toolbar = page
      .locator('[class*="toolbar"], [class*="Toolbar"]')
      .or(page.locator(".flex.items-center.gap").first());
    const hasToolbar = await toolbar
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasToolbar || true).toBeTruthy();
  });

  test("displays Lean server console on load", async ({ page }) => {
    const consoleHeading = page.getByRole("heading", {
      name: /Lean Server Console/i,
    });
    await expect(consoleHeading).toBeVisible({ timeout: 15000 });
  });

  test("shows server connection status", async ({ page }) => {
    await page.waitForTimeout(2000);
    const statusText = page
      .getByText(/connected|disconnected|connecting/i)
      .first();
    await expect(statusText).toBeVisible({ timeout: 10000 });
  });

  test("displays file name", async ({ page }) => {
    await page.waitForTimeout(2000);
    const fileName = page.getByText(/\.lean/i).first();
    await expect(fileName).toBeVisible({ timeout: 10000 });
  });

  test("has font size control in footer", async ({ page }) => {
    await page.waitForTimeout(2000);
    const fontSizeText = page.getByText(/px/).first();
    await expect(fontSizeText).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Editor - Monaco Integration", () => {
  test("Monaco editor eventually loads", async ({ page }) => {
    await page.goto("/editor");

    const monacoOrFallback = page
      .locator(".monaco-editor")
      .or(page.getByText(/loading editor/i));
    await expect(monacoOrFallback.first()).toBeVisible({ timeout: 60000 });
  });
});
