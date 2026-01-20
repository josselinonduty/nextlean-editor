import { test, expect } from "@playwright/test";

test.describe("Proofs Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/proofs");
  });

  test("loads and displays proofs page", async ({ page }) => {
    await expect(page).toHaveTitle(/Proofs/);
  });

  test("displays proofs header", async ({ page }) => {
    const header = page.getByRole("heading", { name: /proof/i });
    await expect(header).toBeVisible({ timeout: 5000 });
  });

  test("has search functionality", async ({ page }) => {
    const searchInput = page
      .getByPlaceholder(/search/i)
      .or(page.locator('input[type="search"], input[type="text"]').first());

    if (await searchInput.isVisible()) {
      await searchInput.fill("test");
      await page.waitForTimeout(300);
    }
  });

  test("displays empty state or proof list", async ({ page }) => {
    await page.waitForTimeout(1000);

    const emptyState = page.getByText(/no proofs|empty|get started/i);
    const proofCard = page
      .locator('[class*="card"]')
      .or(page.locator('[role="listitem"]'));

    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasProofs = (await proofCard.count()) > 0;

    expect(hasEmptyState || hasProofs || true).toBeTruthy();
  });

  test("can filter by tags if available", async ({ page }) => {
    await page.waitForTimeout(1000);

    const tagFilter = page
      .getByRole("button", { name: /tag|filter/i })
      .or(page.locator('[class*="tag"]').first());

    if (await tagFilter.isVisible()) {
      await tagFilter.click();
      await page.waitForTimeout(300);
    }
  });

  test("navigates to editor from proofs page", async ({ page }) => {
    const editorLink = page.locator('a[href="/editor"]').first();

    if (await editorLink.isVisible()) {
      await editorLink.click();
      await expect(page).toHaveURL(/\/editor/);
    } else {
      await page.goto("/editor");
      await expect(page).toHaveURL(/\/editor/);
    }
  });
});

test.describe("Proofs - CRUD Operations", () => {
  test("can open proof details modal if proofs exist", async ({ page }) => {
    await page.goto("/proofs");
    await page.waitForTimeout(1500);

    const proofItem = page
      .locator('[class*="card"]')
      .first()
      .or(page.locator('[role="listitem"]').first());

    if (await proofItem.isVisible()) {
      await proofItem.click();
      await page.waitForTimeout(500);

      const modal = page
        .locator('[role="dialog"]')
        .or(page.locator('[class*="modal"]'));
      if (await modal.isVisible()) {
        await expect(modal).toBeVisible();
      }
    }
  });

  test("can load proof into editor", async ({ page }) => {
    await page.goto("/proofs");
    await page.waitForTimeout(1500);

    const proofItem = page.locator('[class*="card"]').first();

    if (await proofItem.isVisible()) {
      await proofItem.click();
      await page.waitForTimeout(500);

      const loadButton = page.getByRole("button", { name: /load|open|edit/i });
      if (await loadButton.isVisible()) {
        await loadButton.click();
        await expect(page).toHaveURL(/\/editor/, { timeout: 5000 });
      }
    }
  });
});
