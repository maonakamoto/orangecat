#!/bin/bash

# Load environment variables
export SUPABASE_ACCESS_TOKEN=sbp_7bc7546939c5675c6146d5773f83f05b0131c614

echo "🔧 Applying Post Duplication Fix Migration"
echo "=========================================="
echo ""

# Apply migration using Supabase CLI against the self-hosted DB (supabase.orangecat.ch) - managed cloud retired
echo "📝 Pushing migration to database..."
npx supabase db push --db-url "${POSTGRES_URL:?POSTGRES_URL is required (self-hosted: supabase.orangecat.ch) - managed cloud retired}"

echo ""
echo "✨ Migration complete!"
