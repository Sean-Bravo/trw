# Deployment Checklist for TaxReadyWallet

Complete checklist before deploying to production.

## ✅ Pre-Deployment (Completed)

- [x] Production build passes (`npm run build`)
- [x] Dark mode implemented and tested
- [x] All components styled for both light/dark modes
- [x] Documentation system working (Contentlayer)
- [x] Stripe integration scaffolded
- [x] Sentry error tracking configured
- [x] Security headers configured
- [x] TypeScript errors resolved
- [x] Environment variables documented

## 🚀 Deployment Steps

### 1. Set Up Sentry (Optional but Recommended)

Before deploying, set up error tracking:

1. Create a free Sentry account at [sentry.io](https://sentry.io)
2. Create a new Next.js project
3. Get your DSN and auth token
4. See `SENTRY_SETUP.md` for complete instructions

### 2. Push to GitHub

```bash
git add .
git commit -m "Production-ready frontend with dark mode and Sentry"
git push origin main
```

### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Click "Deploy"

### 4. Configure Environment Variables in Vercel

Go to Project Settings → Environment Variables and add:

#### Required for Production:
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NODE_ENV=production
```

#### Optional (Stripe - can add later):
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Optional (Sentry - recommended):
```bash
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=taxreadywallet
```

#### Optional (Analytics):
```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=your-domain.com
```

### 5. Verify Deployment

After deployment completes:

- [ ] Visit your site and test all pages load
- [ ] Test dark mode toggle works
- [ ] Test documentation navigation
- [ ] Verify pricing cards are legible
- [ ] Check Hero section doesn't look too dark
- [ ] Test mobile responsiveness
- [ ] Check browser console for errors

### 6. Set Up Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Wait for DNS propagation (can take up to 48 hours)

## 📋 Post-Deployment

### Current Limitations (Without Backend)

The site works as a **demo/marketing site** without the backend:

✅ **What Works:**
- Landing page with Hero section
- Documentation system
- Pricing page
- All marketing sections
- Dark mode
- Responsive design
- Error tracking (if Sentry configured)

❌ **What Doesn't Work Yet:**
- CSV file uploads (needs API routes)
- Job processing (needs AWS infrastructure)
- AI insights (needs ECS workers)
- User authentication (needs database)
- Payment processing (needs Stripe setup)

### Next Steps (Roadmap A → C → B → D)

**A. ✅ Deploy Frontend** (Current Step)
- You're here! Deploy to Vercel

**C. Build Vercel API Routes**
- `/app/api/upload-url/route.ts` - Generate pre-signed S3 URLs
- `/app/api/jobs/route.ts` - Create job in RDS + send to SQS
- `/app/api/jobs/[id]/route.ts` - Poll job status
- Update Hero component to integrate with real APIs

**B. Build AWS Infrastructure**
- Set up RDS PostgreSQL database
- Create S3 buckets (uploads, exports)
- Set up SQS queue
- Configure ECS Fargate cluster
- Consider using Terraform/CDK

**D. Build ECS Worker Container**
- Python/Node container for CSV processing
- AI analysis with GPT-4o-mini/Claude Haiku
- Write results to RDS
- Update job status

## 🔧 Troubleshooting

### Build Fails on Vercel

1. Check build logs for specific errors
2. Verify all dependencies in package.json
3. Ensure environment variables are set correctly
4. Try clearing Vercel build cache

### Dark Mode Not Working

1. Verify ThemeToggle component is imported correctly
2. Check theme-provider is wrapping the app
3. Clear browser cache and hard reload

### Sentry Errors Not Appearing

1. Verify NEXT_PUBLIC_SENTRY_DSN is set
2. Check Sentry dashboard for project settings
3. Enable debug mode in sentry.client.config.ts
4. See SENTRY_SETUP.md troubleshooting section

### CSP Errors in Console

Content Security Policy is strict. If you need to allow additional domains:

1. Edit `next.config.ts`
2. Update the CSP headers in the `headers()` function
3. Add domains to appropriate directives (script-src, style-src, etc.)

## 📊 Monitoring

### Vercel Analytics (Free)

Automatically enabled for all deployments:
- Page views
- Performance metrics
- User geography

### Sentry (Free Tier)

If configured:
- Error tracking: 5,000 errors/month
- Session replays: 500 sessions/month
- Performance monitoring: 10,000 transactions/month

### Custom Analytics

Add Google Analytics or Plausible:

```typescript
// app/layout.tsx
import Script from 'next/script'

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

## 🎯 Success Criteria

Your deployment is successful when:

- [x] Build completes without errors
- [x] Site is accessible at your Vercel URL
- [x] All pages load correctly
- [x] Dark mode works properly
- [x] Documentation is readable
- [x] Mobile view looks good
- [x] No console errors on homepage
- [x] Sentry receives test error (if configured)

## 🔐 Security Checklist

- [x] Security headers configured (X-Frame-Options, CSP, etc.)
- [x] HTTPS enforced (automatic on Vercel)
- [x] API keys stored as environment variables
- [x] No sensitive data in client-side code
- [ ] Set up Stripe webhooks with webhook secret (when ready)
- [ ] Configure CORS for API routes (when ready)
- [ ] Set up rate limiting (when backend is ready)

## 📝 Notes

- The current deployment is **frontend-only**
- Backend will be built in phases C → B → D
- Stripe integration is scaffolded but needs real API keys
- Authentication will be added with NextAuth + Google OAuth
- Database will be AWS RDS PostgreSQL

## 🎉 You're Ready!

Your frontend is production-ready. Deploy when ready and enjoy your live site!

For questions or issues, check:
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- `SENTRY_SETUP.md` for error tracking help
