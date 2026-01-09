# Security Quick Start Guide

## Pre-Launch Critical Checklist (Must Complete Before Going Live)

### Week 1: Foundation Setup
```
□ Install SSL/TLS certificate
□ Set up environment variables (.env.local, .env.production)
□ Configure database with encryption
□ Set up file upload with size limits (10MB max)
□ Add basic file type validation
□ Enable HTTPS-only mode
```

### Week 2: Authentication
```
□ Install NextAuth.js or Clerk
  npm install next-auth
  npm install @auth/prisma-adapter
□ Configure email/password login
□ Add Google OAuth
□ Set password requirements (12+ chars)
□ Implement session management
□ Add logout functionality
```

### Week 3: API Security
```
□ Install rate limiting
  npm install @upstash/ratelimit
  npm install @upstash/redis
□ Set rate limits:
  - File upload: 10/hour
  - API calls: 100/hour
  - Login attempts: 5/15min
□ Add input validation (Zod)
  npm install zod
□ Implement CORS configuration
```

### Week 4: Payment & Monitoring
```
□ Set up Stripe account
  npm install stripe @stripe/stripe-js
□ Configure webhook handlers
□ Add Sentry for error tracking
  npm install @sentry/nextjs
□ Set up uptime monitoring
```

---

## Installation Commands

### Core Dependencies
```bash
# Authentication
npm install next-auth @auth/prisma-adapter
npm install bcrypt
npm install @types/bcrypt --save-dev

# Validation
npm install zod

# Rate Limiting
npm install @upstash/ratelimit @upstash/redis

# Payments
npm install stripe @stripe/stripe-js

# Monitoring
npm install @sentry/nextjs

# Security
npm install helmet
npm install express-rate-limit
npm install sanitize-html

# Database
npm install @prisma/client
npm install prisma --save-dev
```

---

## Environment Variables Setup

Create `.env.local`:
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/taxreadywallet"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Sentry
SENTRY_DSN="https://...@sentry.io/..."

# AWS S3 (File Storage)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="taxreadywallet-uploads"
```

---

## Security Headers (next.config.ts)

```typescript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## Quick Security Tests

### Test 1: SSL/TLS
```bash
curl -I https://taxreadywallet.com
# Should return: Strict-Transport-Security header
```

### Test 2: Rate Limiting
```bash
# Make 10 rapid requests
for i in {1..10}; do curl https://taxreadywallet.com/api/upload; done
# Should get 429 Too Many Requests after limit
```

### Test 3: Authentication
```bash
# Try accessing protected route without auth
curl https://taxreadywallet.com/api/user/profile
# Should return 401 Unauthorized
```

### Test 4: File Upload Validation
```bash
# Try uploading executable file
curl -F "file=@malware.exe" https://taxreadywallet.com/api/upload
# Should be rejected with 400 Bad Request
```

---

## Security Services Signup

### Essential (Free Tier Available)
1. **Cloudflare** - DDoS protection, CDN
   - Visit: cloudflare.com
   - Cost: Free plan available

2. **Upstash** - Redis for rate limiting
   - Visit: upstash.com
   - Cost: Free 10K requests/day

3. **Sentry** - Error tracking
   - Visit: sentry.io
   - Cost: Free 5K events/month

### Recommended (Paid)
4. **Stripe** - Payment processing
   - Visit: stripe.com
   - Cost: 2.9% + $0.30 per transaction

5. **AWS** - File storage (S3)
   - Visit: aws.amazon.com
   - Cost: ~$5-20/month

6. **Vercel Pro** - Hosting with enhanced security
   - Visit: vercel.com
   - Cost: $20/month

---

## Security Incidents Response

### If you detect suspicious activity:

1. **Immediate Actions**
   ```bash
   # Disable affected user accounts
   # Block suspicious IP addresses in Cloudflare
   # Rotate API keys
   # Review audit logs
   ```

2. **Investigation**
   - Check Sentry for error spikes
   - Review authentication logs
   - Check database for unauthorized changes
   - Examine file upload history

3. **Communication**
   - Notify affected users within 72 hours (GDPR requirement)
   - Post status update if widespread
   - Document incident for compliance

---

## Monthly Security Checklist

```
□ Review Sentry error logs
□ Check for dependency updates (npm audit)
□ Review rate limit violations
□ Audit user access logs
□ Test backup restore
□ Review Stripe disputes/chargebacks
□ Check SSL certificate expiration
□ Update security documentation
```

---

## Resources

- **OWASP Top 10**: owasp.org/www-project-top-ten
- **Next.js Security**: nextjs.org/docs/advanced-features/security-headers
- **Stripe Security**: stripe.com/docs/security
- **GDPR Compliance**: gdpr.eu/compliance
- **SOC 2 Guide**: vanta.com/resources/soc-2-compliance-guide

---

**Need Help?** Contact security@taxreadywallet.com
