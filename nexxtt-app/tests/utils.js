import { test as base } from '@playwright/test';

// Demo user credentials - these should be configured in .env or obtained from Supabase
const USERS = {
  admin: {
    email: 'riya@nexxtt.io',
    // Password needs to be set - check Supabase for actual password
  },
  agency: {
    email: 'alex@brightagency.com.au',
  },
  agencyClient: {
    email: 'sarah@coastalrealty.com.au',
  },
  directClient: {
    email: 'marcus@techcore.com',
  },
};

// Default demo password (commonly used in Supabase demos)
const DEMO_PASSWORD = 'demo1234';

export const test = base.extend({
  // Custom fixture for logging in as different user types
  adminUser: async ({ page }, use) => {
    await loginAs(page, USERS.admin.email, DEMO_PASSWORD);
    await use({ email: USERS.admin.email, role: 'admin' });
  },

  agencyUser: async ({ page }, use) => {
    await loginAs(page, USERS.agency.email, DEMO_PASSWORD);
    await use({ email: USERS.agency.email, role: 'agency' });
  },

  agencyClientUser: async ({ page }, use) => {
    await loginAs(page, USERS.agencyClient.email, DEMO_PASSWORD);
    await use({ email: USERS.agencyClient.email, role: 'agency_client' });
  },

  directClientUser: async ({ page }, use) => {
    await loginAs(page, USERS.directClient.email, DEMO_PASSWORD);
    await use({ email: USERS.directClient.email, role: 'direct_client' });
  },
});

export async function loginAs(page, email, password) {
  await page.goto('/login');

  // Wait for login page to load
  await page.waitForLoadState('networkidle');

  // Try to find and click the demo login button or fill the form
  const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]');
  const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]');

  // Check if we're on a demo login page (has demo buttons)
  const demoButton = page.locator('button:has-text("Sign in"), a:has-text("Sign in")').first();

  if (await emailInput.isVisible()) {
    // Standard login form
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await page.click('button[type="submit"], button:has-text("Sign in")');
  } else if (await demoButton.isVisible()) {
    // Demo login page - click the appropriate demo button based on email
    await page.click(`button:has-text("${email.split('@')[0]}")`);
  }

  // Wait for navigation after login
  await page.waitForLoadState('networkidle');

  // Verify we're logged in (should not be on login page anymore)
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    throw new Error(`Login failed for ${email}. Please check credentials.`);
  }
}

export async function logout(page) {
  // Try to find logout button
  const logoutButton = page.locator('a:has-text("Sign out"), button:has-text("Sign out"), [href="/login"]');
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  }
  await page.goto('/login');
}
