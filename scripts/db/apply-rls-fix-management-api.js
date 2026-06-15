#!/usr/bin/env node
console.error(
  'RETIRED: this script used the managed Supabase Cloud Management API, which was removed 2026-06. The DB is now self-hosted (supabase.orangecat.ch). Apply SQL via: psql "$POSTGRES_URL" -f <file>. See docs/operations/DECOMMISSION-CLOUD.md.'
);
process.exit(1);
/**
 * Apply RLS Fix via Supabase Management API
 *
 * Uses the Supabase Management API to execute the migration SQL directly.
 */

require('dotenv').config({ path: '.env.local' });
const { readFileSync } = require('fs');
const { join } = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!supabaseUrl || !accessToken) {
  console.error('❌ Missing required environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ Could not extract project ref from URL');
  process.exit(1);
}

const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function applyMigration() {
  console.log('🚀 Applying RLS fix migration via Management API...\n');

  try {
    const migrationPath = join(
      __dirname,
      '../../supabase/migrations/20250130000007_fix_group_members_rls_recursion.sql'
    );
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📤 Sending migration to Supabase Management API...');

    const response = await fetch(managementApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        query: migrationSQL,
      }),
    });

    const responseText = await response.text();

    if (response.ok) {
      console.log('✅ Migration applied successfully!');
      console.log('🔄 Please refresh your browser to test groups functionality.');
      return;
    }

    // Try parsing as JSON for error details
    let errorDetails;
    try {
      errorDetails = JSON.parse(responseText);
    } catch {
      errorDetails = { message: responseText };
    }

    console.error('❌ Migration failed');
    console.error(`   Status: ${response.status}`);
    console.error(`   Error: ${JSON.stringify(errorDetails, null, 2)}`);

    console.log('\n📋 Please apply manually via Supabase Studio:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    console.log(
      '   2. Copy contents of: supabase/migrations/20250130000007_fix_group_members_rls_recursion.sql'
    );
    console.log('   3. Paste and execute');

    process.exit(1);
  } catch (error) {
    console.error('❌ Failed to apply migration:', error.message);
    console.error('\n📋 Please apply manually via Supabase Studio SQL editor.');
    process.exit(1);
  }
}

applyMigration();
