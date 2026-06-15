#!/bin/bash

SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
BASE_URL="${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL is required (self-hosted: https://supabase.orangecat.ch) - managed cloud retired}"

echo "=== Checking conversations table ==="
curl -s "${BASE_URL}/rest/v1/conversations?select=*&limit=3" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" | jq .

echo ""
echo "=== Checking messages table ==="
curl -s "${BASE_URL}/rest/v1/messages?select=*&limit=3" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" | jq .

echo ""
echo "=== Checking conversation_participants table ==="
curl -s "${BASE_URL}/rest/v1/conversation_participants?select=*&limit=3" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" | jq .

echo ""
echo "=== Checking profiles table ==="
curl -s "${BASE_URL}/rest/v1/profiles?select=id,username,name&limit=3" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" | jq .
