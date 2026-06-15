#!/bin/bash

SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
BASE_URL="${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL is required (self-hosted: https://supabase.orangecat.ch) - managed cloud retired}"

echo "=== Listing all messaging-related functions ==="
curl -s "${BASE_URL}/rest/v1/rpc/" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" 2>&1 | grep -i "message\|conversation\|chat\|read" || echo "Could not list"

echo ""
echo "=== Testing mark_conversation_read ==="
curl -s "${BASE_URL}/rest/v1/rpc/mark_conversation_read" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"p_conversation_id": "39084687-d46f-48ca-a577-1fa0c1d4d7e2"}' | jq .

echo ""
echo "=== Testing send_message ==="
curl -s "${BASE_URL}/rest/v1/rpc/send_message" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"p_conversation_id": "39084687-d46f-48ca-a577-1fa0c1d4d7e2", "p_content": "Test message"}' | jq .
