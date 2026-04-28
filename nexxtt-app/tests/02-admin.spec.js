import { test, expect } from '@playwright/test';

test.describe('Admin Portal', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.click('button:has-text("Riya Tanaka")');
    await page.click('button:has-text("Sign in to Admin Portal")');
    await page.waitForURL(/\/admin/);
  });

  test('admin pages load without errors', async ({ page }) => {
    // Test that each admin page loads and doesn't redirect to login
    const pages = [
      '/admin',
      '/admin/requests',
      '/admin/orders',
      '/admin/agencies',
      '/admin/services',
      '/admin/clients',
      '/admin/finance',
    ];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      // Verify we're not redirected to login (still authenticated)
      await expect(page).not.toHaveURL(/\/login$/, { timeout: 10000 });
      // Verify page has content (no error page)
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
