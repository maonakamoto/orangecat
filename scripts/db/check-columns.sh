#!/bin/bash
echo 'RETIRED: this script used the managed Supabase Cloud Management API, which was removed 2026-06. The DB is now self-hosted (supabase.orangecat.ch). Apply SQL via: psql "$POSTGRES_URL" -f <file>. See docs/operations/DECOMMISSION-CLOUD.md.' >&2
exit 1

API_URL="https://api.supabase.com/v1/projects/ohkueislstxomdjavyhs/database/query"
TOKEN="sbp_7bc7546939c5675c6146d5773f83f05b0131c614"

QUERY='SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '\''profiles'\'' AND table_schema = '\''public'\'' ORDER BY ordinal_position;'

curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$QUERY\"}" | jq '.'
