import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Sign in/);

    // Check demo user buttons are present (these are the persona cards)
    await expect(page.locator('button:has-text("Alex Johnson")')).toBeVisible(); // Agency
    await expect(page.locator('button:has-text("Sarah Mitchell")')).toBeVisible(); // Client
    await expect(page.locator('button:has-text("Riya Tanaka")')).toBeVisible(); // Admin
    await expect(page.locator('button:has-text("Marcus Reid")')).toBeVisible(); // Direct Client
  });

  test('can login as admin', async ({ page }) => {
    await page.goto('/login');
    // Click on admin persona (Riya Tanaka)
    await page.click('button:has-text("Riya Tanaka")');
    // Click sign in button
    await page.click('button:has-text("Sign in to Admin Portal")');
    await page.waitForURL(/\/admin/);
    await expect(page).toHaveURL(/\/admin/);
  });

  test('can login as agency', async ({ page }) => {
    await page.goto('/login');
    // Click on agency persona (Alex Johnson)
    await page.click('button:has-text("Alex Johnson")');
    // Click sign in button
    await page.click('button:has-text("Sign in to Agency Portal")');
    await page.waitForURL(/\/agency\/dashboard/);
    await expect(page).toHaveURL(/\/agency\/dashboard/);
  });

  test('can login as client', async ({ page }) => {
    await page.goto('/login');
    // Click on client persona (Sarah Mitchell)
    await page.click('button:has-text("Sarah Mitchell")');
    // Click sign in button
    await page.click('button:has-text("Sign in to Client Portal")');
    await page.waitForURL(/\/portal\//);
    await expect(page).toHaveURL(/\/portal\//);
  });

  test('can login as direct client', async ({ page }) => {
    await page.goto('/login');
    // Click on direct client persona (Marcus Reid)
    await page.click('button:has-text("Marcus Reid")');
    // Click sign in button
    await page.click('button:has-text("Sign in to Direct Portal")');
    await page.waitForURL(/\/direct\/dashboard/);
    await expect(page).toHaveURL(/\/direct\/dashboard/);
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');

    // Fill in invalid credentials using email/password fields
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button:has-text("Sign in")');

    // Should show error
    await expect(page.locator('text=Invalid login credentials')).toBeVisible({ timeout: 10000 });
  });
});
