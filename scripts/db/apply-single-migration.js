#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (self-hosted: https://supabase.orangecat.ch) - managed cloud retired'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql(sql) {
  const { data, error } = await supabase.rpc('exec', { sql });
  if (error) {
    throw error;
  }
  return data;
}

async function applyMigration() {
  console.log('🔧 Applying Post Duplication Fix Migration...\n');

  const migrationPath = path.join(
    __dirname,
    'supabase/migrations/20251119120000_fix_post_duplication.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📝 Executing migration SQL...\n');

  try {
    // Execute the entire SQL file
    const { error } = await supabase.rpc('query', { query: sql });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('\n⚠️  Trying alternative approach: splitting into statements...\n');

      // Split and execute statement by statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');

        console.log(`[${i + 1}/${statements.length}] ${preview}...`);

        try {
          await executeSql(stmt + ';');
          console.log('  ✅ Success\n');
        } catch (err) {
          if (err.message.includes('already exists') || err.message.includes('does not exist')) {
            console.log("  ⚠️  Already exists/doesn't exist, continuing...\n");
          } else {
            console.error('  ❌ Error:', err.message, '\n');
          }
        }
      }
    } else {
      console.log('✅ Migration executed successfully!\n');
    }

    // Verify the migration
    console.log('🔍 Verifying migration...\n');

    // Check post_visibility table
    try {
      const { error: tableError } = await supabase.from('post_visibility').select('id').limit(1);

      if (tableError) {
        console.log('❌ post_visibility table not found');
      } else {
        console.log('✅ post_visibility table exists');
      }
    } catch (err) {
      console.log('❌ post_visibility table check failed:', err.message);
    }

    // Check view
    try {
      const { error: viewError } = await supabase
        .from('community_timeline_no_duplicates')
        .select('id')
        .limit(1);

      if (viewError) {
        console.log('❌ community_timeline_no_duplicates view not found');
      } else {
        console.log('✅ community_timeline_no_duplicates view exists');
      }
    } catch (err) {
      console.log('❌ View check failed:', err.message);
    }

    console.log('\n✨ Migration process complete!\n');
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  }
}

applyMigration().catch(err => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
});
