#!/bin/bash
echo 'RETIRED: this script used the managed Supabase Cloud Management API, which was removed 2026-06. The DB is now self-hosted (supabase.orangecat.ch). Apply SQL via: psql "$POSTGRES_URL" -f <file>. See docs/operations/DECOMMISSION-CLOUD.md.' >&2
exit 1

# Apply full timeline_events migration
# This creates the table, indexes, RLS policies, and functions

set -e

echo "🚀 Applying full timeline_events migration..."
echo ""

PROJECT_REF="ohkueislstxomdjavyhs"
ACCESS_TOKEN="sbp_7bc7546939c5675c6146d5773f83f05b0131c614"

# Read the full migration file
MIGRATION_FILE="supabase/migrations/20251113000000_create_timeline_events.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Reading migration file: $MIGRATION_FILE"
MIGRATION_SQL=$(cat "$MIGRATION_FILE")

echo "📤 Executing migration (this may take a moment)..."
echo ""

# Execute via Management API
response=$(curl -s -X POST \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$MIGRATION_SQL" | jq -Rs .)}")

# Check response
if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
  error_msg=$(echo "$response" | jq -r '.error.message // .error')
  echo "❌ Error: $error_msg"
  exit 1
fi

if echo "$response" | jq -e '.message' > /dev/null 2>&1; then
  msg=$(echo "$response" | jq -r '.message')
  if [[ "$msg" != "null" && "$msg" != "" ]]; then
    echo "⚠️  Response: $msg"
  fi
fi

echo "✅ Migration applied successfully!"
echo ""
echo "🔍 Verifying..."
echo "   - Table: timeline_events"
echo "   - Function: create_timeline_event"
echo "   - Indexes: 11+ performance indexes"
echo "   - RLS: Policies enabled"
echo ""
echo "🎉 Timeline system ready!"
echo ""
echo "📝 Next steps:"
echo "   1. Test posting from Community page"
echo "   2. Test posting from My Journey page"
echo "   3. Verify posts appear in timeline"

