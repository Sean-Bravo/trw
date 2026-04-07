# API Tier Cleanup: Free → Starter ($29/mo)

The free API tier ($0, 10 files/mo) has been removed. Starter ($29/mo, 100 files/mo) is now the lowest tier.

> Consumer subscription tiers (`free | pro | premium`) are separate and unchanged.

---

## All Fixed

- [x] `components/marketing/APIPricing.tsx` — Starter/Growth/Business
- [x] `components/marketing/FAQ.tsx` — "What's the cheapest plan?"
- [x] `components/marketing/Footer.tsx` — Updated copy to "$29/mo"
- [x] `content/docs/api/index.md` — Rate limits table, removed free row
- [x] `lib/api-keys.ts` — Removed `free` from `ApiTier`, default is `starter`
- [x] `app/api/webhooks/stripe/route.ts` — Cancellation downgrades to `starter`
- [x] `components/dashboard/DashboardHeader.tsx` — Shows "Starter Plan"
- [x] `app/signup/page.tsx` — Passes `api_tier` cookie for Stripe checkout flow
- [x] `app/login/page.tsx` — Passes `api_tier` cookie for Stripe checkout flow
- [x] `app/verify/page.tsx` — Redirects to developer page when cookie present
- [x] `components/dashboard/ApiKeyManager.tsx` — Auto-subscribe on pending cookie
- [x] `ARCHITECTURE.md` — Updated API tier table to Starter/Growth/Business
- [x] `TaxFormatter_Landing_Page_Redesign.md` — Updated tier descriptions
- [x] `TaxFormatter_API_Strategy.md` — Updated pricing table, roadmap, and copy
- [x] `backend/terraform/variables.tf` — Updated Gemini key comment
- [x] All test files updated
