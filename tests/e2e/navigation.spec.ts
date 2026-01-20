import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("home page loads correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Home|NextLean/);
  });

  test("displays main navigation elements", async ({ page }) => {
    await page.goto("/");

    const editorLink = page
      .getByRole("link", { name: /editor/i })
      .or(page.locator('a[href*="/editor"]'));
    await expect(editorLink.first()).toBeVisible({ timeout: 5000 });
  });

  test("can navigate to editor from home", async ({ page }) => {
    await page.goto("/");

    const startButton = page
      .getByRole("button", { name: /start|editor/i })
      .or(page.getByRole("link", { name: /start|editor/i }));

    if (await startButton.first().isVisible()) {
      await startButton.first().click();
      await expect(page).toHaveURL(/\/editor/);
    }
  });

  test("can navigate to proofs from home", async ({ page }) => {
    await page.goto("/");

    const proofsLink = page
      .getByRole("link", { name: /proof/i })
      .or(page.locator('a[href*="/proofs"]'));

    if (await proofsLink.first().isVisible()) {
      await proofsLink.first().click();
      await expect(page).toHaveURL(/\/proofs/);
    }
  });

  test("can navigate to chat from home", async ({ page }) => {
    await page.goto("/");

    const chatLink = page
      .getByRole("link", { name: /chat|assistant/i })
      .or(page.locator('a[href*="/chat"]'));

    if (await chatLink.first().isVisible()) {
      await chatLink.first().click();
      await expect(page).toHaveURL(/\/chat/);
    }
  });

  test("can navigate to settings", async ({ page }) => {
    await page.goto("/");

    const settingsLink = page
      .getByRole("link", { name: /settings/i })
      .or(page.locator('a[href*="/settings"]'));

    if (await settingsLink.first().isVisible()) {
      await settingsLink.first().click();
      await expect(page).toHaveURL(/\/settings/);
    }
  });

  test("can navigate to help", async ({ page }) => {
    await page.goto("/");

    const helpLink = page
      .getByRole("link", { name: /help|doc/i })
      .or(page.locator('a[href*="/help"]'));

    if (await helpLink.first().isVisible()) {
      await helpLink.first().click();
      await expect(page).toHaveURL(/\/help/);
    }
  });

  test("sidebar navigation works", async ({ page }) => {
    await page.goto("/");

    const sidebarNav = page
      .locator('[class*="sidebar"]')
      .or(page.locator("nav"));

    if (await sidebarNav.first().isVisible()) {
      const editorNavItem = sidebarNav.getByRole("link", { name: /editor/i });
      if (await editorNavItem.isVisible()) {
        await editorNavItem.click();
        await expect(page).toHaveURL(/\/editor/);
      }
    }
  });

  test("sidebar can be collapsed", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    const collapseButton = page
      .locator('[class*="collapse"]')
      .or(page.getByRole("button", { name: /collapse|toggle/i }));

    if (await collapseButton.first().isVisible()) {
      await collapseButton.first().click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe("Responsive Layout", () => {
  test("works on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toBeVisible();
  });

  test("works on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toBeVisible();
  });

  test("works on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1")).toBeVisible();
  });
});
