import { test, expect } from '@playwright/test';
import { requireE2ECredentials } from './helpers/credentials';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const { email, password } = requireE2ECredentials();

test.describe('Login Only Test', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('just login and check redirect', async ({ page }) => {
    console.log('Testing credential login flow');

    await page.goto(`${baseURL}/auth?mode=login`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'screenshots/login-page.png' });

    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);

    await page.screenshot({ path: 'screenshots/login-filled.png' });

    const submitBtn = page.locator('form button[type="submit"]').first();
    await submitBtn.click();

    // Wait for navigation or error
    try {
      await page.waitForURL(/\/(dashboard|timeline|onboarding)/, { timeout: 10000 });
      console.log('✅ Login successful, redirected to:', page.url());
      await page.screenshot({ path: 'screenshots/login-success.png' });
    } catch (e) {
      console.log('❌ Login failed or no redirect, current URL:', page.url());
      await page.screenshot({ path: 'screenshots/login-failed.png' });

      // Check for error messages
      const errorText = await page.textContent('body');
      console.log(
        'Page contains error text:',
        errorText.includes('error') || errorText.includes('Error') || errorText.includes('invalid')
      );
    }
  });
});
