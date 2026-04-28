import { test, expect } from '@playwright/test';

test.describe('Agency Portal', () => {
  test.beforeEach(async ({ page }) => {
    // Login as agency
    await page.goto('/login');
    await page.click('button:has-text("Alex Johnson")');
    await page.click('button:has-text("Sign in to Agency Portal")');
    await page.waitForURL(/\/agency\/dashboard/);
  });

  test('all agency pages load correctly', async ({ page }) => {
    const pages = [
      '/agency/dashboard',
      '/agency/requests',
      '/agency/orders',
      '/agency/clients',
      '/agency/settings',
    ];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await expect(page).not.toHaveURL(/\/login$/, { timeout: 10000 });
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('requests page has tabs', async ({ page }) => {
    await page.goto('/agency/requests');

    // Check that tabs section exists
    await expect(page.locator('text=Needs Your Review')).toBeVisible();
  });

  test('tabs are clickable', async ({ page }) => {
    await page.goto('/agency/requests');

    // Click each tab and verify URL changes
    const tabs = ['Needs Your Review', 'Active', 'Converted to job', 'Closed', 'All'];

    for (const tab of tabs) {
      const tabElement = page.locator(`a:has-text("${tab}")`).first();
      if (await tabElement.isVisible()) {
        await tabElement.click();
        await page.waitForURL(new RegExp(tab.toLowerCase().replace(/\s+/g, '-')));
      }
    }
  });
});
