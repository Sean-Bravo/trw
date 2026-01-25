/**
 * E2E: Bank statement upload/download flow (P1)
 * Run with: npm run test:e2e -- e2e/bank-statement.spec.ts
 * Note: Full bank flow tests require Pro/Premium test user.
 */

import { test, expect, Page } from '@playwright/test';

// Helper to login
async function login(page: Page, email?: string, password?: string) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Wait for form to be ready
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });

  await page.fill('input[type="email"]', email || process.env['E2E_USER_EMAIL'] || 'test@example.com');
  await page.fill('input[type="password"]', password || process.env['E2E_USER_PASSWORD'] || 'Password123!');

  // Click and wait for navigation
  await Promise.all([
    page.waitForURL(/dashboard|verify|login/, { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);

  // Check if we're still on login (means error or slow redirect)
  if (page.url().includes('/login')) {
    const errorVisible = await page.getByText(/Invalid email or password/i).isVisible();
    if (errorVisible) {
      throw new Error('Login failed: Invalid credentials');
    }
    // Wait a bit more for redirect (WebKit can be slow)
    await page.waitForURL(/dashboard|verify/, { timeout: 15000 });
  }
}

test.describe('Bank statement flow', () => {
  // Run tests serially to avoid rate limiting on login
  test.describe.configure({ mode: 'serial' });

  // Skip WebKit browsers - they have cookie/session issues with NextAuth
  test.skip(({ browserName }) => browserName === 'webkit', 'WebKit has session persistence issues');

  test('dashboard has mode selector for Crypto/Bank', async ({ page }) => {
    await login(page);
    // Login already redirects to dashboard, no need to navigate again

    // Wait for dashboard to load
    await expect(page.getByText('Upload CSV File')).toBeVisible({ timeout: 10000 });

    // Check for ModeSelector component - should have Crypto Trades option
    await expect(page.getByText(/Crypto Trades/i)).toBeVisible({ timeout: 5000 });
  });

  test('dashboard shows Bank Statement option in mode selector', async ({ page }) => {
    await login(page);
    // Login already redirects to dashboard

    // Wait for dashboard to load
    await expect(page.getByText('Upload CSV File')).toBeVisible({ timeout: 10000 });

    // Check for Bank Statement option in mode selector
    await expect(page.getByText(/Bank Statement/i)).toBeVisible({ timeout: 5000 });
  });

  test('free user can see mode selector options', async ({ page }) => {
    await login(page);
    // Login already redirects to dashboard

    // Wait for page to load
    await expect(page.getByText('Upload CSV File')).toBeVisible({ timeout: 10000 });

    // Both mode options should be visible
    const cryptoMode = page.getByText(/Crypto Trades/i);
    const bankMode = page.getByText(/Bank Statement/i);

    await expect(cryptoMode).toBeVisible();
    await expect(bankMode).toBeVisible();
  });
});
