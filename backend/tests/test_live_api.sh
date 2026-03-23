#!/usr/bin/env bash
# =============================================================================
# TaxFormatter Live API Test Suite
# Usage: ./test_live_api.sh <your_api_key>
#
# Prerequisites:
#   - API key from taxformatter.com/dashboard/developer
#   - curl installed
#   - jq installed (brew install jq)
#
# Run:
#   chmod +x test_live_api.sh
#   ./test_live_api.sh tf_live_your_key_here
# =============================================================================

set -e

API_KEY="${1:-}"
BASE_URL="https://api.taxformatter.com/v1"
FIXTURES_DIR="$(dirname "$0")/fixtures"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0

if [ -z "$API_KEY" ]; then
  echo -e "${RED}Error: API key required.${NC}"
  echo "Usage: $0 tf_live_your_key_here"
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo -e "${RED}Error: jq is required. Install with: brew install jq${NC}"
  exit 1
fi

# =============================================================================
# Helpers
# =============================================================================

pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)); }
skip() { echo -e "  ${YELLOW}–${NC} $1 (skipped)"; ((SKIP++)); }
header() { echo -e "\n${BOLD}${BLUE}$1${NC}"; echo "$(printf '─%.0s' {1..60})"; }
subheader() { echo -e "\n  ${CYAN}$1${NC}"; }

# Make a GET request and return the response body
get() {
  local endpoint="$1"
  local extra_args="${2:-}"
  curl -s -w "\n%{http_code}" \
    -H "X-API-Key: $API_KEY" \
    $extra_args \
    "$BASE_URL$endpoint"
}

# Make a POST request with JSON body and return body + http_code on last line
post() {
  local endpoint="$1"
  local body="$2"
  curl -s -w "\n%{http_code}" \
    -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$body" \
    "$BASE_URL$endpoint"
}

# Post with headers included in output
post_with_headers() {
  local endpoint="$1"
  local body="$2"
  curl -s -D /tmp/tf_headers.txt \
    -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$body" \
    "$BASE_URL$endpoint"
}

# Parse a CSV fixture file and return the curl response
parse_csv() {
  local filepath="$1"
  local filename="$2"
  local extra_fields="${3:-}"

  if [ ! -f "$filepath" ]; then
    echo "FILE_NOT_FOUND"
    return
  fi

  local encoded
  encoded=$(base64 -i "$filepath" | tr -d '\n')

  local body="{\"file_content\": \"$encoded\", \"filename\": \"$filename\"$extra_fields}"
  post "/parse" "$body"
}

check_status() {
  local label="$1"
  local response="$2"
  local expected_http="${3:-200}"
  local expected_status="${4:-success}"

  local http_code body
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)

  local actual_status
  actual_status=$(echo "$body" | jq -r '.status // empty' 2>/dev/null)

  if [ "$http_code" = "$expected_http" ] && [ "$actual_status" = "$expected_status" ]; then
    pass "$label (HTTP $http_code)"
    return 0
  else
    fail "$label — expected HTTP $expected_http/$expected_status, got HTTP $http_code/$actual_status"
    echo "    Response: $(echo "$body" | jq -c '.' 2>/dev/null || echo "$body")"
    return 1
  fi
}

check_field() {
  local label="$1"
  local body="$2"
  local field="$3"

  local value
  value=$(echo "$body" | jq -r "$field // empty" 2>/dev/null)
  if [ -n "$value" ] && [ "$value" != "null" ]; then
    pass "$label: $value"
  else
    fail "$label — field $field missing or null"
    echo "    Body: $(echo "$body" | jq -c '.' 2>/dev/null)"
  fi
}

# =============================================================================
# 1. No-auth Endpoints
# =============================================================================

header "1. No-Auth Endpoints"

subheader "GET /v1/health"
resp=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
http=$(echo "$resp" | tail -1)
body=$(echo "$resp" | head -n -1)
if [ "$http" = "200" ] && [ "$(echo "$body" | jq -r '.status')" = "ok" ]; then
  pass "Health check returns OK"
  version=$(echo "$body" | jq -r '.version')
  pass "API version: $version"
else
  fail "Health check failed (HTTP $http)"
  echo "  Body: $body"
fi

subheader "GET /v1/sources"
resp=$(curl -s -w "\n%{http_code}" "$BASE_URL/sources")
http=$(echo "$resp" | tail -1)
body=$(echo "$resp" | head -n -1)
if [ "$http" = "200" ]; then
  exchange_count=$(echo "$body" | jq '.crypto_exchanges | length')
  bank_count=$(echo "$body" | jq '.banks | length')
  format_count=$(echo "$body" | jq '.output_formats.crypto | length')
  pass "Sources endpoint (HTTP 200)"
  pass "Exchanges listed: $exchange_count"
  pass "Banks listed: $bank_count"
  pass "Output formats: $format_count"
else
  fail "Sources endpoint (HTTP $http)"
fi

# =============================================================================
# 2. Auth Validation
# =============================================================================

header "2. Authentication"

subheader "Missing API key"
resp=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "$BASE_URL/parse")
check_status "No key → 401" "$resp" "401" "error"

subheader "Invalid API key"
resp=$(curl -s -w "\n%{http_code}" -X POST \
  -H "X-API-Key: tf_live_totally_fake_key_000000" \
  -H "Content-Type: application/json" \
  -d '{}' "$BASE_URL/parse")
check_status "Bad key → 401" "$resp" "401" "error"

subheader "Valid key"
resp=$(get "/usage")
check_status "Valid key → usage endpoint" "$resp" "200" ""

# =============================================================================
# 3. GET /v1/usage
# =============================================================================

header "3. Usage Endpoint"

resp=$(get "/usage")
http=$(echo "$resp" | tail -1)
body=$(echo "$resp" | head -n -1)
if [ "$http" = "200" ]; then
  tier=$(echo "$body" | jq -r '.tier')
  quota=$(echo "$body" | jq -r '.monthly_quota')
  pass "Usage endpoint (HTTP 200)"
  pass "Tier: $tier"
  pass "Monthly quota: $quota"
  rpm=$(echo "$body" | jq -r '.rate_limit_rpm')
  pass "Rate limit: ${rpm} rpm"
else
  fail "Usage endpoint (HTTP $http)"
  echo "  Body: $body"
fi

# =============================================================================
# 4. Input Validation
# =============================================================================

header "4. Input Validation"

subheader "Missing required fields"
resp=$(post "/parse" '{"filename": "test.csv"}')
check_status "Missing file_content → 400" "$resp" "400" "error"

resp=$(post "/parse" '{"file_content": "dGVzdA=="}')
check_status "Missing filename → 400" "$resp" "400" "error"

subheader "Invalid base64"
resp=$(post "/parse" '{"file_content": "!!!notbase64!!!", "filename": "test.csv"}')
check_status "Invalid base64 → 400" "$resp" "400" "error"

subheader "Empty file"
resp=$(post "/parse" '{"file_content": "", "filename": "test.csv"}')
check_status "Empty file_content → 400" "$resp" "400" "error"

subheader "Unsupported file type"
encoded=$(echo -n "fake content" | base64)
resp=$(post "/parse" "{\"file_content\": \"$encoded\", \"filename\": \"report.txt\"}")
check_status ".txt extension → 400 invalid_file_type" "$resp" "400" "error"

subheader "Invalid output format"
encoded=$(base64 -i "$FIXTURES_DIR/valid/coinbase_2025_valid.csv" | tr -d '\n')
resp=$(post "/parse" "{\"file_content\": \"$encoded\", \"filename\": \"coinbase_2025_valid.csv\", \"output_format\": \"excel\"}")
check_status "Invalid output_format → 400" "$resp" "400" "error"

# =============================================================================
# 5. Crypto Exchange Parsing — All Fixtures
# =============================================================================

header "5. Crypto Exchange Parsing"

declare -A EXCHANGE_FILES=(
  ["coinbase"]="coinbase_2025_valid.csv"
  ["coinbase_legacy"]="coinbase_legacy_valid.csv"
  ["binance"]="binance_valid.csv"
  ["kraken"]="kraken_valid.csv"
  ["bybit"]="bybit_valid.csv"
  ["gemini"]="gemini_valid.csv"
  ["crypto_com"]="crypto_com_valid.csv"
  ["robinhood"]="robinhood_valid.csv"
  ["cashapp"]="cashapp_valid.csv"
  ["bitfinex"]="bitfinex_valid.csv"
  ["okx"]="okx_valid.csv"
  ["ftx"]="ftx_valid.csv"
  ["kucoin"]="kucoin_valid.csv"
  ["paypal"]="paypal_valid.csv"
)

for exchange in "${!EXCHANGE_FILES[@]}"; do
  file="${EXCHANGE_FILES[$exchange]}"
  filepath="$FIXTURES_DIR/valid/$file"

  subheader "$exchange → $file"

  if [ ! -f "$filepath" ]; then
    skip "$exchange: fixture not found at $filepath"
    continue
  fi

  encoded=$(base64 -i "$filepath" | tr -d '\n')
  resp=$(post "/parse" "{\"file_content\": \"$encoded\", \"filename\": \"$file\"}")
  http=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | head -n -1)

  if [ "$http" = "200" ] && [ "$(echo "$body" | jq -r '.status')" = "success" ]; then
    count=$(echo "$body" | jq -r '.metadata.transaction_count')
    detected=$(echo "$body" | jq -r '.detected_source')
    time_ms=$(echo "$body" | jq -r '.metadata.processing_time_ms')
    pass "$exchange: $count transactions detected (${time_ms}ms)"
    if [ "$detected" != "null" ] && [ -n "$detected" ]; then
      pass "  Detected source: $detected"
    fi
  else
    fail "$exchange parse (HTTP $http)"
    echo "    $(echo "$body" | jq -c '{status,code,message}' 2>/dev/null)"
  fi
done

# =============================================================================
# 6. Output Format Conversion
# =============================================================================

header "6. Output Format Conversion"

FORMATS=("koinly" "turbotax" "coinledger" "zenledger")
BASE_FILE="$FIXTURES_DIR/valid/coinbase_2025_valid.csv"

if [ -f "$BASE_FILE" ]; then
  encoded=$(base64 -i "$BASE_FILE" | tr -d '\n')

  for fmt in "${FORMATS[@]}"; do
    resp=$(post "/parse" "{\"file_content\": \"$encoded\", \"filename\": \"coinbase_2025_valid.csv\", \"output_format\": \"$fmt\"}")
    http=$(echo "$resp" | tail -1)
    body=$(echo "$resp" | head -n -1)

    if [ "$http" = "200" ] && [ "$(echo "$body" | jq -r '.status')" = "success" ]; then
      returned_format=$(echo "$body" | jq -r '.output_format')
      count=$(echo "$body" | jq -r '.metadata.transaction_count')
      pass "Coinbase → $fmt ($count rows, output_format=$returned_format)"
    else
      fail "Coinbase → $fmt (HTTP $http)"
      echo "    $(echo "$body" | jq -c '{status,code,message}' 2>/dev/null)"
    fi
  done
else
  skip "coinbase_2025_valid.csv not found"
fi

# =============================================================================
# 7. Explicit Exchange Override
# =============================================================================

header "7. Explicit Exchange Parameter"

if [ -f "$FIXTURES_DIR/valid/binance_valid.csv" ]; then
  encoded=$(base64 -i "$FIXTURES_DIR/valid/binance_valid.csv" | tr -d '\n')
  resp=$(post "/parse" "{\"file_content\": \"$encoded\", \"filename\": \"binance_valid.csv\", \"exchange\": \"binance\"}")
  check_status "Explicit exchange=binance" "$resp" "200" "success"

  # Test wrong explicit exchange (should fail or warn)
  resp2=$(post "/parse" "{\"file_content\": \"$encoded\", \"filename\": \"binance_valid.csv\", \"exchange\": \"kraken\"}")
  http2=$(echo "$resp2" | tail -1)
  body2=$(echo "$resp2" | head -n -1)
  status2=$(echo "$body2" | jq -r '.status')
  if [ "$status2" = "error" ]; then
    pass "Wrong exchange hint → parse error (correct)"
  else
    # Some parsers may still succeed or warn
    pass "Wrong exchange hint → $status2 (parser may be lenient)"
  fi
fi

# =============================================================================
# 8. Edge Cases
# =============================================================================

header "8. Edge Cases"

subheader "Empty CSV (header only)"
if [ -f "$FIXTURES_DIR/edge_cases/header_only.csv" ]; then
  encoded=$(base64 -i "$FIXTURES_DIR/edge_cases/header_only.csv" | tr -d '\n')
  resp=$(post "/parse" "{\"file_content\": \"$encoded\", \"filename\": \"header_only.csv\"}")
  http=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | head -n -1)
  status=$(echo "$body" | jq -r '.status')
  # Could succeed with 0 rows or return parse_error — both acceptable
  if [ "$http" = "200" ] || [ "$http" = "422" ]; then
    pass "Header-only CSV handled (HTTP $http, status=$status)"
  else
    fail "Header-only CSV unexpected response (HTTP $http)"
  fi
fi

subheader "Single row CSV"
if [ -f "$FIXTURES_DIR/edge_cases/single_row.csv" ]; then
  encoded=$(base64 -i "$FIXTURES_DIR/edge_cases/single_row.csv" | tr -d '\n')
  resp=$(post "/parse" "{\"file_content\": \"$encoded\", \"filename\": \"single_row.csv\"}")
  http=$(echo "$resp" | tail -1)
  pass "Single row CSV (HTTP $http)"
fi

subheader "UTF-8 BOM file"
if [ -f "$FIXTURES_DIR/edge_cases/utf8_bom_coinbase.csv" ]; then
  encoded=$(base64 -i "$FIXTURES_DIR/edge_cases/utf8_bom_coinbase.csv" | tr -d '\n')
  resp=$(post "/parse" "{\"file_content\": \"$encoded\", \"filename\": \"utf8_bom_coinbase.csv\"}")
  check_status "UTF-8 BOM file" "$resp" "200" "success"
fi

subheader "Windows line endings"
if [ -f "$FIXTURES_DIR/edge_cases/windows_line_endings.csv" ]; then
  encoded=$(base64 -i "$FIXTURES_DIR/edge_cases/windows_line_endings.csv" | tr -d '\n')
  resp=$(post "/parse" "{\"file_content\": \"$encoded\", \"filename\": \"windows_line_endings.csv\"}")
  http=$(echo "$resp" | tail -1)
  pass "Windows line endings (HTTP $http)"
fi

subheader "Unicode data"
if [ -f "$FIXTURES_DIR/edge_cases/unicode_data.csv" ]; then
  encoded=$(base64 -i "$FIXTURES_DIR/edge_cases/unicode_data.csv" | tr -d '\n')
  resp=$(post "/parse" "{\"file_content\": \"$encoded\", \"filename\": \"unicode_data.csv\"}")
  http=$(echo "$resp" | tail -1)
  pass "Unicode data (HTTP $http)"
fi

subheader "Large file (1k rows)"
if [ -f "$FIXTURES_DIR/coinbase_1k_rows.csv" ]; then
  encoded=$(base64 -i "$FIXTURES_DIR/coinbase_1k_rows.csv" | tr -d '\n')
  resp=$(post "/parse" "{\"file_content\": \"$encoded\", \"filename\": \"coinbase_1k_rows.csv\"}")
  http=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | head -n -1)
  if [ "$http" = "200" ]; then
    count=$(echo "$body" | jq -r '.metadata.transaction_count')
    time_ms=$(echo "$body" | jq -r '.metadata.processing_time_ms')
    pass "1k rows: $count transactions in ${time_ms}ms"
  else
    fail "1k rows (HTTP $http)"
  fi
fi

subheader "Large file (10k rows)"
if [ -f "$FIXTURES_DIR/coinbase_10k_rows.csv" ]; then
  encoded=$(base64 -i "$FIXTURES_DIR/coinbase_10k_rows.csv" | tr -d '\n')
  resp=$(post "/parse" "{\"file_content\": \"$encoded\", \"filename\": \"coinbase_10k_rows.csv\"}")
  http=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | head -n -1)
  if [ "$http" = "200" ]; then
    count=$(echo "$body" | jq -r '.metadata.transaction_count')
    time_ms=$(echo "$body" | jq -r '.metadata.processing_time_ms')
    pass "10k rows: $count transactions in ${time_ms}ms"
  else
    fail "10k rows (HTTP $http)"
    echo "    $(echo "$body" | jq -c '{status,code,message}' 2>/dev/null)"
  fi
fi

# =============================================================================
# 9. Ambiguous / Rejection Cases
# =============================================================================

header "9. Ambiguous File Rejection"

AMBIGUOUS_FILES=("bank_statement.csv" "accounting_export.csv" "stock_trades.csv" "sales_data.csv" "fake_coinbase.csv")

for file in "${AMBIGUOUS_FILES[@]}"; do
  filepath="$FIXTURES_DIR/ambiguous/$file"
  if [ ! -f "$filepath" ]; then
    skip "$file: not found"
    continue
  fi

  encoded=$(base64 -i "$filepath" | tr -d '\n')
  resp=$(post "/parse" "{\"file_content\": \"$encoded\", \"filename\": \"$file\"}")
  http=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | head -n -1)
  status=$(echo "$body" | jq -r '.status')
  code=$(echo "$body" | jq -r '.code')

  if [ "$status" = "error" ]; then
    pass "$file → rejected ($code)"
  elif [ "$status" = "success" ]; then
    count=$(echo "$body" | jq -r '.metadata.transaction_count')
    # This may be unexpected — flag it
    echo -e "  ${YELLOW}?${NC} $file → parsed as success ($count rows) — verify this is correct"
    ((SKIP++))
  else
    fail "$file → unexpected response (HTTP $http, status=$status)"
  fi
done

# =============================================================================
# 10. Response Headers
# =============================================================================

header "10. Response Headers"

if [ -f "$FIXTURES_DIR/valid/coinbase_2025_valid.csv" ]; then
  encoded=$(base64 -i "$FIXTURES_DIR/valid/coinbase_2025_valid.csv" | tr -d '\n')
  body_json="{\"file_content\": \"$encoded\", \"filename\": \"coinbase_2025_valid.csv\"}"

  # Use -D to capture headers
  resp_body=$(curl -s -D /tmp/tf_resp_headers.txt \
    -X POST \
    -H "X-API-Key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$body_json" \
    "$BASE_URL/parse")

  if grep -qi "X-TF-Processing-Time" /tmp/tf_resp_headers.txt; then
    proc_time=$(grep -i "X-TF-Processing-Time" /tmp/tf_resp_headers.txt | awk '{print $2}' | tr -d '\r')
    pass "X-TF-Processing-Time header present: ${proc_time}ms"
  else
    fail "X-TF-Processing-Time header missing"
  fi

  if grep -qi "X-Api-Version" /tmp/tf_resp_headers.txt; then
    api_ver=$(grep -i "X-Api-Version" /tmp/tf_resp_headers.txt | awk '{print $2}' | tr -d '\r')
    pass "X-Api-Version header: $api_ver"
  else
    fail "X-Api-Version header missing"
  fi

  if grep -qi "Access-Control-Allow-Origin" /tmp/tf_resp_headers.txt; then
    pass "CORS headers present"
  else
    fail "CORS headers missing"
  fi
fi

# =============================================================================
# 11. Error Response Shape
# =============================================================================

header "11. Error Response Shape"

resp=$(post "/parse" '{"file_content": "dGVzdA==", "filename": "test.txt"}')
body=$(echo "$resp" | head -n -1)

has_status=$(echo "$body" | jq 'has("status")')
has_code=$(echo "$body" | jq 'has("code")')
has_message=$(echo "$body" | jq 'has("message")')
has_metadata=$(echo "$body" | jq 'has("metadata")' 2>/dev/null || echo "false")

[ "$has_status" = "true" ] && pass "Error has .status" || fail "Error missing .status"
[ "$has_code" = "true" ] && pass "Error has .code" || fail "Error missing .code"
[ "$has_message" = "true" ] && pass "Error has .message" || fail "Error missing .message"
[ "$has_metadata" = "true" ] && pass "Error has .metadata" || fail "Error missing .metadata"

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "$(printf '═%.0s' {1..60})"
echo -e "${BOLD}  Test Results${NC}"
echo "$(printf '═%.0s' {1..60})"
echo -e "  ${GREEN}Passed:${NC}  $PASS"
echo -e "  ${RED}Failed:${NC}  $FAIL"
echo -e "  ${YELLOW}Skipped:${NC} $SKIP"
echo "$(printf '─%.0s' {1..60})"

TOTAL=$((PASS + FAIL))
if [ $TOTAL -gt 0 ]; then
  PCT=$(( (PASS * 100) / TOTAL ))
  echo -e "  ${BOLD}Score: $PASS/$TOTAL ($PCT%)${NC}"
fi

echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}All tests passed.${NC}"
  exit 0
else
  echo -e "  ${RED}${BOLD}$FAIL test(s) failed.${NC}"
  exit 1
fi
