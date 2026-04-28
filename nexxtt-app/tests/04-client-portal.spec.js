import { test, expect } from '@playwright/test';

test.describe('Client Portal (White-label)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as client
    await page.goto('/login');
    await page.click('button:has-text("Sarah Mitchell")');
    await page.click('button:has-text("Sign in to Client Portal")');
    await page.waitForURL(/\/portal\//);
  });

  test('all client portal pages load correctly', async ({ page }) => {
    const pages = [
      '/portal/bright-agency/coastal-realty',
      '/portal/bright-agency/coastal-realty/requests',
      '/portal/bright-agency/coastal-realty/projects',
    ];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await expect(page).not.toHaveURL(/\/login$/, { timeout: 10000 });
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('requests page has tabs', async ({ page }) => {
    await page.goto('/portal/bright-agency/coastal-realty/requests');

    // Check that tabs exist
    await expect(page.locator('text=Awaiting Agency')).toBeVisible();
  });
});
