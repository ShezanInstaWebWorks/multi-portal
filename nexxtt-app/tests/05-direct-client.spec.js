import { test, expect } from '@playwright/test';

test.describe('Direct Client Portal', () => {
  test.beforeEach(async ({ page }) => {
    // Login as direct client
    await page.goto('/login');
    await page.click('button:has-text("Marcus Reid")');
    await page.click('button:has-text("Sign in to Direct Portal")');
    await page.waitForURL(/\/direct\/dashboard/);
  });

  test('all direct client pages load correctly', async ({ page }) => {
    const pages = [
      '/direct/dashboard',
      '/direct/requests',
      '/direct/orders',
      '/direct/orders/new',
    ];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await expect(page).not.toHaveURL(/\/login$/, { timeout: 10000 });
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
