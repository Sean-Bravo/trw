/**
 * E2E: Authentication flows (P1)
 * Run with: npm run test:e2e -- e2e/auth.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page loads and has form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('user sees error for wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'WrongPass1!');
    await page.click('button[type="submit"]');
    // The app shows "Invalid email or password" for wrong credentials
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible({ timeout: 10000 });
  });

  test('signup page loads and has form', async ({ page }) => {
    await page.goto('/signup');
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    // Check for email input
    await expect(page.locator('input#email[type="email"]')).toBeVisible({ timeout: 10000 });
    // Check for password input
    await expect(page.locator('input#password[type="password"]')).toBeVisible();
    // Check for confirm password input
    await expect(page.locator('input#confirmPassword[type="password"]')).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });
});
