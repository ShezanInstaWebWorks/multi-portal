import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('all admin pages are accessible when logged in as admin', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.click('button:has-text("Riya Tanaka")');
    await page.click('button:has-text("Sign in to Admin Portal")');
    await page.waitForURL(/\/admin/);

    const adminPages = [
      '/admin',
      '/admin/requests',
      '/admin/orders',
      '/admin/agencies',
      '/admin/services',
      '/admin/clients',
      '/admin/finance',
    ];

    for (const path of adminPages) {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login$/, { timeout: 5000 });
    }
  });

  test('all agency pages are accessible when logged in as agency', async ({ page }) => {
    // Login as agency
    await page.goto('/login');
    await page.click('button:has-text("Alex Johnson")');
    await page.click('button:has-text("Sign in to Agency Portal")');
    await page.waitForURL(/\/agency\/dashboard/);

    const agencyPages = [
      '/agency/dashboard',
      '/agency/requests',
      '/agency/orders',
      '/agency/clients',
    ];

    for (const path of agencyPages) {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/login$/, { timeout: 5000 });
    }
  });

  test('unauthenticated users are redirected to login', async ({ page }) => {
    const protectedPages = [
      '/admin',
      '/admin/requests',
      '/agency/dashboard',
      '/agency/requests',
      '/portal/bright-agency/coastal-realty',
      '/direct/dashboard',
    ];

    for (const path of protectedPages) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    }
  });
});
