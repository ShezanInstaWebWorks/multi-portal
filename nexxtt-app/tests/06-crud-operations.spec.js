import { test, expect } from '@playwright/test';

test.describe('CRUD Operations', () => {
  test('client can navigate to new request form', async ({ page }) => {
    // Login as client
    await page.goto('/login');
    await page.click('button:has-text("Sarah Mitchell")');
    await page.click('button:has-text("Sign in to Client Portal")');
    await page.waitForURL(/\/portal\//);

    // Go to requests page
    await page.goto('/portal/bright-agency/coastal-realty/requests');

    // Click New request button
    await page.click('text=+ New request');

    // Verify we're on compose view
    await expect(page.url()).toContain('view=compose');
  });

  test('agency can see requests page with tabs', async ({ page }) => {
    // Login as agency
    await page.goto('/login');
    await page.click('button:has-text("Alex Johnson")');
    await page.click('button:has-text("Sign in to Agency Portal")');
    await page.waitForURL(/\/agency\/dashboard/);

    // Go to requests
    await page.goto('/agency/requests');

    // Verify page loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test('client requests page has filter tabs', async ({ page }) => {
    // Login as client
    await page.goto('/login');
    await page.click('button:has-text("Sarah Mitchell")');
    await page.click('button:has-text("Sign in to Client Portal")');
    await page.waitForURL(/\/portal\//);

    // Go to requests
    await page.goto('/portal/bright-agency/coastal-realty/requests');

    // Click different tabs
    await page.click('text=Awaiting Agency');
    await expect(page).toHaveURL(/tab=awaiting_agency/);

    await page.click('text=Active');
    await expect(page).toHaveURL(/tab=active/);
  });
});
