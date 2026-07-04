#!/usr/bin/env node

import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3000';

async function testApplication() {
  console.log(`🚀 Starting browser automation test against ${BASE_URL}...\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    console.log('📄 Test 1: Loading homepage...');
    const homeResponse = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (!homeResponse?.ok()) {
      throw new Error(`Homepage returned HTTP ${homeResponse?.status() ?? 'unknown'}`);
    }
    console.log(`✅ Homepage loaded (${await page.title()})\n`);

    console.log('🔐 Test 2: Checking auth page...');
    const authResponse = await page.goto(`${BASE_URL}/auth`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    if (!authResponse?.ok()) {
      throw new Error(`Auth page returned HTTP ${authResponse?.status() ?? 'unknown'}`);
    }
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    if (!emailInput || !passwordInput) {
      throw new Error('Login form fields not found on /auth');
    }
    console.log('✅ Auth page and login form OK\n');

    console.log('🏥 Test 3: API health endpoint...');
    const healthResponse = await page.goto(`${BASE_URL}/api/health`, { timeout: 15000 });
    if (!healthResponse?.ok()) {
      throw new Error(`Health endpoint returned HTTP ${healthResponse?.status() ?? 'unknown'}`);
    }
    console.log('✅ API health OK\n');

    console.log('👤 Test 4: Profile endpoint requires auth...');
    const profileResponse = await page.goto(`${BASE_URL}/api/profile`, { timeout: 15000 });
    const profileStatus = profileResponse?.status() ?? 0;
    if (profileStatus !== 401 && profileStatus !== 403) {
      throw new Error(`Expected 401/403 from /api/profile without auth, got ${profileStatus}`);
    }
    console.log(`✅ Profile endpoint protected (${profileStatus})\n`);

    console.log('🎉 Browser automation smoke passed');
  } finally {
    await browser.close();
  }
}

testApplication().catch(error => {
  console.error('❌ Test failed:', error.message || error);
  process.exit(1);
});
