#!/bin/sh
# Run this AFTER the dev server is started (npm run dev)
# Seeds the initial CBC user account into Supabase

SECRET="8160a7f3c4bf9d2e"
EMAIL="ariel.ibayan@gmail.com"
PASSWORD="Psalm23"
BASE_URL="${APP_URL:-http://localhost:3000}"

echo "Seeding cbc user to $BASE_URL ..."

curl -s -X POST "$BASE_URL/api/admin/seed-users" \
  -H "Content-Type: application/json" \
  -d "{\"secret\":\"$SECRET\",\"id\":\"cbc\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"churchId\":\"cbc\"}" \
  | cat

echo ""
echo "Done."
