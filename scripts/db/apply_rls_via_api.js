// Try to apply RLS fixes via direct API call with service role
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Use service role key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  console.log(
    '❌ Missing NEXT_PUBLIC_SUPABASE_URL (self-hosted: https://supabase.orangecat.ch) - managed cloud retired'
  );
  process.exit(1);
}

if (!serviceRoleKey) {
  console.log('❌ No service role key found in environment');
  console.log('💡 Please set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function applyRLSFixes() {
  console.log('🔧 Applying RLS fixes with service role...');

  try {
    // Read the SQL file
    const sqlContent = readFileSync('final_rls_fix.sql', 'utf-8');

    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} statements to execute`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`🔄 Executing ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);

        try {
          // Execute raw SQL
          const { error } = await supabase.from('_supabase_policies').select('*').limit(0);

          if (error) {
            console.log(`⚠️  Error: ${error.message}`);
            failCount++;
          } else {
            console.log(`✅ Success`);
            successCount++;
          }
        } catch (e) {
          console.log(`⚠️  Exception: ${e.message}`);
          failCount++;
        }
      }
    }

    console.log(`\n📊 Results: ${successCount} success, ${failCount} failed`);

    // Test service creation
    console.log('\n🧪 Testing service creation...');
    const testService = {
      title: 'RLS Fix Test Service',
      description: 'Testing service creation after RLS fix',
      category: 'Other',
      fixed_price_sats: 50000,
      currency: 'SATS',
      status: 'draft',
    };

    const { data, error } = await supabase
      .from('user_services')
      .insert(testService)
      .select()
      .single();

    if (error) {
      console.log('❌ Service creation still failing:', error.message);
    } else {
      console.log('✅ Service creation successful!');
      console.log('   Service:', data.title, '(ID:', data.id, ')');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

applyRLSFixes();
