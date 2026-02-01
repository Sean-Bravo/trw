#!/bin/bash
# Production Verification Script for TaxFormatter
# Run this script to verify all production services are working correctly

# Don't exit on error - we want to collect all results
# set -e

# Configuration
PROD_URL="${PROD_URL:-https://taxformatter.com}"
TIMEOUT=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
print_header() {
    echo ""
    echo "============================================"
    echo "$1"
    echo "============================================"
}

check_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    ((WARNINGS++))
}

# Start verification
echo ""
echo "=========================================="
echo "  TaxFormatter Production Verification"
echo "  Target: $PROD_URL"
echo "  Time: $(date)"
echo "=========================================="

print_header "1. Health Check Endpoints"

# Check main site loads (follow redirects)
if curl -sL -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$PROD_URL" | grep -q "200"; then
    check_pass "Main site returns 200"
else
    check_fail "Main site not accessible"
fi

# Check API health (if endpoint exists)
API_HEALTH=$(curl -sL -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$PROD_URL/api/health" 2>/dev/null || echo "000")
if [ "$API_HEALTH" = "200" ]; then
    check_pass "API health endpoint returns 200"
elif [ "$API_HEALTH" = "404" ]; then
    check_warn "API health endpoint not found (consider adding /api/health)"
else
    check_fail "API health endpoint failed (HTTP $API_HEALTH)"
fi

print_header "2. Security Headers"

# Check for important security headers
HEADERS=$(curl -s -I --max-time $TIMEOUT "$PROD_URL" 2>/dev/null)

if echo "$HEADERS" | grep -qi "strict-transport-security"; then
    check_pass "HSTS header present"
else
    check_fail "HSTS header missing"
fi

if echo "$HEADERS" | grep -qi "x-frame-options"; then
    check_pass "X-Frame-Options header present"
else
    check_warn "X-Frame-Options header missing"
fi

if echo "$HEADERS" | grep -qi "x-content-type-options"; then
    check_pass "X-Content-Type-Options header present"
else
    check_warn "X-Content-Type-Options header missing"
fi

if echo "$HEADERS" | grep -qi "content-security-policy"; then
    check_pass "Content-Security-Policy header present"
else
    check_warn "Content-Security-Policy header missing"
fi

print_header "3. Critical Pages"

# Check pricing page
if curl -sL -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$PROD_URL/pricing" | grep -q "200"; then
    check_pass "Pricing page accessible"
else
    check_fail "Pricing page not accessible"
fi

# Check login page
if curl -sL -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$PROD_URL/login" | grep -q "200"; then
    check_pass "Login page accessible"
else
    check_fail "Login page not accessible"
fi

# Check signup page
if curl -sL -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$PROD_URL/signup" | grep -q "200"; then
    check_pass "Signup page accessible"
else
    check_fail "Signup page not accessible"
fi

# Check docs
if curl -sL -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$PROD_URL/docs" | grep -q "200"; then
    check_pass "Docs page accessible"
else
    check_fail "Docs page not accessible"
fi

print_header "4. API Endpoints"

# Test presigned URL endpoint (should require auth, return 401)
PRESIGNED_STATUS=$(curl -sL -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$PROD_URL/api/uploads/presigned-url" -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
if [ "$PRESIGNED_STATUS" = "401" ] || [ "$PRESIGNED_STATUS" = "400" ]; then
    check_pass "Presigned URL endpoint responds (auth required as expected)"
elif [ "$PRESIGNED_STATUS" = "000" ]; then
    check_fail "Presigned URL endpoint not reachable"
else
    check_warn "Presigned URL endpoint returned unexpected status: $PRESIGNED_STATUS"
fi

# Test checkout endpoint (should require auth, return 401)
CHECKOUT_STATUS=$(curl -sL -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$PROD_URL/api/checkout" -X POST -H "Content-Type: application/json" -d '{"plan":"PRO"}' 2>/dev/null || echo "000")
if [ "$CHECKOUT_STATUS" = "401" ]; then
    check_pass "Checkout endpoint responds (auth required as expected)"
elif [ "$CHECKOUT_STATUS" = "000" ]; then
    check_fail "Checkout endpoint not reachable"
else
    check_warn "Checkout endpoint returned status: $CHECKOUT_STATUS"
fi

# Test Stripe webhook endpoint exists
WEBHOOK_STATUS=$(curl -sL -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$PROD_URL/api/webhooks/stripe" -X POST 2>/dev/null || echo "000")
if [ "$WEBHOOK_STATUS" = "400" ] || [ "$WEBHOOK_STATUS" = "401" ]; then
    check_pass "Stripe webhook endpoint exists (signature verification expected)"
elif [ "$WEBHOOK_STATUS" = "000" ]; then
    check_fail "Stripe webhook endpoint not reachable"
else
    check_warn "Stripe webhook returned status: $WEBHOOK_STATUS"
fi

print_header "5. Static Assets"

# Check security.txt
if curl -sL -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$PROD_URL/.well-known/security.txt" | grep -q "200"; then
    check_pass "security.txt accessible"
else
    check_warn "security.txt not found"
fi

# Check robots.txt
if curl -sL -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$PROD_URL/robots.txt" | grep -q "200"; then
    check_pass "robots.txt accessible"
else
    check_warn "robots.txt not found"
fi

# Check sitemap
if curl -sL -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$PROD_URL/sitemap.xml" | grep -q "200"; then
    check_pass "sitemap.xml accessible"
else
    check_warn "sitemap.xml not found"
fi

print_header "6. SSL/TLS"

# Check SSL certificate validity
SSL_EXPIRY=$(echo | openssl s_client -servername taxformatter.com -connect taxformatter.com:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter | cut -d= -f2)
if [ -n "$SSL_EXPIRY" ]; then
    EXPIRY_EPOCH=$(date -j -f "%b %d %T %Y %Z" "$SSL_EXPIRY" "+%s" 2>/dev/null || date -d "$SSL_EXPIRY" "+%s" 2>/dev/null)
    NOW_EPOCH=$(date "+%s")
    DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

    if [ $DAYS_LEFT -gt 30 ]; then
        check_pass "SSL certificate valid ($DAYS_LEFT days remaining)"
    elif [ $DAYS_LEFT -gt 7 ]; then
        check_warn "SSL certificate expiring soon ($DAYS_LEFT days remaining)"
    else
        check_fail "SSL certificate expires in $DAYS_LEFT days!"
    fi
else
    check_warn "Could not verify SSL certificate expiry"
fi

# Summary
print_header "Summary"
echo ""
echo -e "Passed:   ${GREEN}$PASSED${NC}"
echo -e "Failed:   ${RED}$FAILED${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}VERIFICATION FAILED${NC} - Please address the failed checks above"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}VERIFICATION PASSED WITH WARNINGS${NC}"
    exit 0
else
    echo -e "${GREEN}ALL CHECKS PASSED${NC}"
    exit 0
fi
