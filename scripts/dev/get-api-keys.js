console.error(
  'RETIRED: this script scraped the managed Supabase Cloud dashboard for API keys, which was removed 2026-06. The DB is now self-hosted (supabase.orangecat.ch); read keys from .env.local / the self-hosted Studio. See docs/operations/DECOMMISSION-CLOUD.md.'
);
process.exit(1);

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function getSupabaseApiKeys() {
  console.log('🚀 Launching browser to get fresh Supabase API keys...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();

  try {
    console.log('🔗 Navigating to Supabase project...');
    await page.goto('https://app.supabase.com/project/ohkueislstxomdjavyhs/settings/api', {
      waitUntil: 'networkidle2',
    });

    // Wait for the API keys section to load
    console.log('⏳ Waiting for API keys to load...');
    await page.waitForSelector('[data-testid*="api"], .api-key, code, pre', { timeout: 10000 });

    // Try multiple selectors to find the anon key
    const selectors = [
      'code:contains("eyJ")',
      'pre:contains("eyJ")',
      '[data-testid*="anon"]',
      '[data-testid*="api-key"]',
      'tr:has(td:contains("anon")) code',
      'tr:has(td:contains("public")) code',
      '.api-key',
      'code',
    ];

    let anonKey = null;

    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const text = await element.textContent();
          if (text && text.startsWith('eyJ') && text.length > 100) {
            anonKey = text;
            console.log(`✅ Found API key using selector: ${selector}`);
            break;
          }
        }
        if (anonKey) break;
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!anonKey) {
      console.log('❌ Could not find API key automatically.');
      console.log('📋 Please copy the anon public API key manually from the page.');

      // Wait for user to manually copy
      await page.waitForTimeout(30000);
      await browser.close();
      return null;
    }

    console.log(`🔑 Found API key: ${anonKey.substring(0, 20)}...`);

    // Update .env.local file
    const envPath = path.join(__dirname, '.env.local');
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Create backup
    fs.writeFileSync(envPath + '.backup', envContent);

    // Replace the API key
    envContent = envContent.replace(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY="[^"]*"/,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY="${anonKey}"`
    );

    fs.writeFileSync(envPath, envContent);

    console.log('✅ Updated .env.local with fresh API key!');
    console.log('💾 Backup saved to .env.local.backup');

    await browser.close();
    return anonKey;
  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    return null;
  }
}

// Run the function
getSupabaseApiKeys().then(key => {
  if (key) {
    console.log('🎉 Success! OrangeCat should now work!');
    console.log('🔄 Restart your development server: npm run dev');
  } else {
    console.log('⚠️  Manual intervention required.');
    console.log(
      '🔗 Please visit: https://app.supabase.com/project/ohkueislstxomdjavyhs/settings/api'
    );
  }
});
