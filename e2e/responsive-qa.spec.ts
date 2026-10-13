/**
 * E2E: responsive layout guards from the Oct 10 QA pass.
 *
 * Public pages only, no login. Run against a preview with
 *   PLAYWRIGHT_BASE_URL=https://<preview>.vercel.app npm run test:e2e -- e2e/responsive-qa.spec.ts
 *
 * Each test pins one finding:
 *  - no horizontal page scroll at phone width (docs, blog, playground)
 *  - docs "On this page" links resolve to real heading ids
 *  - docs mobile nav drawer renders above the site header
 *  - homepage FAQ answer panel stays in view when the last question is picked
 */

import { test, expect, type Page } from '@playwright/test';

const PHONE = { width: 412, height: 915 };
const DESKTOP = { width: 1440, height: 900 };

async function pageScrollWidth(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth);
}

test.describe('no horizontal overflow at 412px', () => {
  test.use({ viewport: PHONE });

  for (const path of [
    '/docs/api',
    '/docs/understanding-your-results/reading-your-formatted-csv',
    '/docs/tax-issues-flags/staking-income',
    '/blog/three-ways-to-use-taxformatter',
    '/playground',
  ]) {
    test(`${path} fits the viewport`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await pageScrollWidth(page)).toBe(PHONE.width);
    });
  }
});

test.describe('docs table of contents', () => {
  test.use({ viewport: DESKTOP });

  test('every "On this page" link targets an existing heading id', async ({ page }) => {
    await page.goto('/docs/api');
    await page.waitForLoadState('networkidle');

    const hrefs = await page
      .locator('nav a[href^="#"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThan(5);

    for (const href of hrefs) {
      const id = href.slice(1);
      await expect(page.locator(`[id="${id}"]`), `missing target for ${href}`).toHaveCount(1);
    }
  });

  test('clicking a TOC link scrolls the heading below the sticky header', async ({ page }) => {
    await page.goto('/docs/api');
    await page.waitForLoadState('networkidle');

    const link = page.locator('nav a[href="#error-codes"]');
    await link.click();
    await page.waitForTimeout(300);

    const top = await page.locator('#error-codes').evaluate((el) => el.getBoundingClientRect().top);
    const headerBottom = await page.locator('header').first().evaluate((el) => el.getBoundingClientRect().bottom);
    expect(top).toBeGreaterThanOrEqual(headerBottom);
  });
});

test.describe('docs mobile nav drawer', () => {
  test.use({ viewport: PHONE });

  test('close button is on top of the site header', async ({ page }) => {
    await page.goto('/docs/api');
    await page.waitForLoadState('networkidle');

    // The docs shell's own "Open menu" button sits under the page title, not in the site header.
    await page.locator('button[aria-label="Open menu"]').last().click();
    const close = page.locator('button[aria-label="Close menu"]').last();
    await expect(close).toBeVisible();

    const onTop = await close.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit !== null && el.contains(hit);
    });
    expect(onTop).toBe(true);
  });
});

test.describe('homepage FAQ', () => {
  test.use({ viewport: DESKTOP });

  test('answer panel stays in view for the last question', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const lastQuestion = page.getByRole('button', { name: "What's the cheapest plan?" }).first();
    await lastQuestion.scrollIntoViewIfNeeded();
    await lastQuestion.click();
    await page.waitForTimeout(300);

    const panel = page.getByText('The straight answer.').first();
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeLessThan(DESKTOP.height);
  });
});
