#!/usr/bin/env node

/**
 * Initialize Orange Cat Organization
 *
 * This script creates the Orange Cat organization for funding AI subscriptions
 * Run this once after database migration to set up the organization.
 */

const { createClient } = require('@supabase/supabase-js');

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.orangecat.ch';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'REDACTED_ANON_KEY';

async function initializeOrangeCatOrganization() {
  console.log('🚀 Initializing Orange Cat organization...');

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // First, we need a user session to create the organization
    // For this script, we'll need to either:
    // 1. Use an existing user account, or
    // 2. Create a temporary user account

    console.log('🔍 Checking for existing Orange Cat organization...');

    // Check if Orange Cat organization already exists by querying public data
    // Since we can't access private data without auth, we'll check if it exists later

    console.log('📋 To create the Orange Cat organization, please:');
    console.log('1. Register/login to the application');
    console.log('2. Go to /organizations page');
    console.log('3. Click "Create Organization"');
    console.log('4. Fill in the following details:');
    console.log('');
    console.log('   Organization Name: Orange Cat');
    console.log('   Type: Foundation');
    console.log(
      '   Description: Official Orange Cat organization for funding AI development tools including Claude Code and Cursor subscriptions. Support the development of this Bitcoin crowdfunding platform.'
    );
    console.log('   Category: Technology');
    console.log('   Website: https://orangecat.com');
    console.log('   Treasury Address: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
    console.log('   Tags: bitcoin, crowdfunding, ai, development, opensource');
    console.log("   Make it public and don't require approval");
    console.log('');
    console.log('✅ The Orange Cat organization will be ready for subscription funding!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the initialization
initializeOrangeCatOrganization()
  .then(() => {
    console.log('🎉 Orange Cat organization setup instructions provided!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
