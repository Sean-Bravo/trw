# Google Ads Conversion Tracking Setup Guide

Complete guide to set up Google Ads conversion tracking for TaxFormatter.

## ✅ What's Already Implemented

1. **Google Ads Tag** - Fires on every page load
2. **Purchase Conversion** - Tracks when users complete payment
3. **Sign-Up Conversion** - Tracks when users click "Start Free"
4. **Analytics Helper Functions** - Easy-to-use tracking methods

## Step 1: Create Google Ads Account

1. Go to [ads.google.com](https://ads.google.com)
2. Sign in with your Google account
3. Set up your first campaign (or skip for now)
4. Note your **Conversion ID** (format: `AW-XXXXXXXXXX`)

## Step 2: Set Up Conversion Actions

### Purchase Conversion

1. In Google Ads, go to **Tools → Measurement → Conversions**
2. Click **+ New conversion action**
3. Select **Website**
4. Fill in:
   - **Category:** Purchase
   - **Conversion name:** Purchase
   - **Value:** Use specific value from transaction
   - **Count:** One
   - **Click-through window:** 30 days
   - **View-through window:** 1 day
5. Click **Create and Continue**
6. Select **Use Google Tag Manager or Google tag**
7. Note the **Conversion Label** (appears after `/` in the tag)

### Sign-Up Conversion

1. Click **+ New conversion action** again
2. Select **Website**
3. Fill in:
   - **Category:** Submit lead form
   - **Conversion name:** Sign Up
   - **Value:** Don't use a value
   - **Count:** One
   - **Click-through window:** 30 days
   - **View-through window:** 1 day
4. Click **Create and Continue**
5. Note the **Conversion Label**

## Step 3: Add Environment Variables

### Local Development

Add to `.env.local`:

```bash
# Google Ads
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXXX
```

### Vercel Production

1. Go to Project Settings → Environment Variables
2. Add for **Production**, **Preview**, and **Development**:

```bash
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXXX
```

## Step 4: Update Conversion Labels

The conversion labels in the code currently use placeholder paths. Update them with your actual labels:

### Option A: Update lib/analytics.ts (Recommended)

Replace the placeholder labels with your actual conversion labels from Google Ads:

```typescript
// In lib/analytics.ts

export const trackPurchase = (transactionId: string, value: number, currency = 'USD') => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: `${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}/YOUR_PURCHASE_LABEL`, // Replace this
      transaction_id: transactionId,
      value: value,
      currency: currency,
    })
  }
}

export const trackSignUp = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: `${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}/YOUR_SIGNUP_LABEL`, // Replace this
    })
  }
}
```

### Option B: Use Environment Variables (More Flexible)

Add conversion labels as env variables:

```bash
# .env.local and Vercel
NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL=abc123def456
NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL=xyz789uvw012
```

Then update `lib/analytics.ts`:

```typescript
export const trackPurchase = (transactionId: string, value: number, currency = 'USD') => {
  if (typeof window !== 'undefined' && window.gtag) {
    const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL
    window.gtag('event', 'conversion', {
      send_to: `${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}/${label}`,
      transaction_id: transactionId,
      value: value,
      currency: currency,
    })
  }
}
```

## Step 5: Link Google Ads to Google Analytics 4

This enables audience retargeting and enhanced tracking.

### In Google Ads:

1. Go to **Tools → Setup → Linked accounts**
2. Click **Google Analytics (GA4) & Firebase**
3. Click **Link**
4. Select your GA4 property
5. Enable:
   - ✅ Import site metrics
   - ✅ Import Google Analytics conversions
   - ✅ Personalized advertising
6. Click **Link accounts**

### In Google Analytics:

1. Go to **Admin → Property → Google Ads Links**
2. Click **Link Google Ads account**
3. Select your Google Ads account
4. Enable:
   - ✅ Enable personalized advertising
   - ✅ Enable auto-tagging
5. Click **Link accounts**

## Step 6: Test Conversions

### Test Purchase Conversion

1. Run your app locally: `npm run dev`
2. Add `?session_id=test_12345` to your success page URL:
   ```
   http://localhost:3000/success?session_id=test_12345
   ```
3. Open browser DevTools → Console
4. Look for: `🎯 Google Ads: Purchase conversion tracked`
5. Check Google Ads **Conversions** tab (may take 3-24 hours to appear)

### Test Sign-Up Conversion

1. Visit your homepage
2. Click "Start Free" button
3. Open browser DevTools → Console
4. Look for: `🎯 Google Ads: Sign-up conversion tracked`
5. Check Google Ads **Conversions** tab

### Debug Mode

To see conversion events in real-time:

1. Install [Google Tag Assistant](https://tagassistant.google.com/)
2. Click the extension → **Enable debugging**
3. Reload your page
4. Click "Start Free" or visit success page
5. See events in Tag Assistant

## Step 7: Verify Tracking is Working

### Method 1: Google Ads Preview

1. Go to Google Ads → **Tools → Conversions**
2. Click on your conversion action
3. Look for recent conversions in the chart
4. May take 3-24 hours to show

### Method 2: Real-Time in GA4

1. Go to Google Analytics → **Reports → Realtime**
2. Click "Start Free" on your site
3. See event appear in real-time (if GA4 is linked)

### Method 3: Browser DevTools

1. Open DevTools → **Network** tab
2. Filter: `google`
3. Click "Start Free" or visit success page
4. Look for requests to `www.googleadservices.com/pagead/conversion`

## Step 8: Set Up Audiences for Retargeting

Now that tracking is working, create audiences:

### Audience 1: All Website Visitors

1. Google Ads → **Tools → Audience Manager**
2. **+ New audience**
3. **Website visitors**
4. Name: "All Visitors - Last 30 Days"
5. Who to add: Users who visited any page
6. Membership duration: 30 days

### Audience 2: Started Sign-Up (Didn't Complete)

1. Create new audience
2. Name: "Started Sign-Up - Didn't Purchase"
3. Who to add:
   - Users who triggered "Sign-Up" conversion
   - AND did NOT trigger "Purchase" conversion
4. Membership duration: 90 days

### Audience 3: Purchased (Exclude from Ads)

1. Create new audience
2. Name: "Purchased - Exclude"
3. Who to add: Users who triggered "Purchase" conversion
4. Membership duration: 365 days
5. Use this to exclude from ad campaigns

## Step 9: Create Remarketing Campaign

1. **Tools → Campaigns** → **+ New Campaign**
2. Goal: **Website traffic**
3. Campaign type: **Display** or **Search**
4. Audience: Select "Started Sign-Up - Didn't Purchase"
5. Exclusions: Add "Purchased - Exclude"
6. Ad copy: Focus on benefits they saw when they clicked "Start Free"

## Current Implementation Details

### Files Modified

```
✅ app/layout.tsx - Added GoogleAds component
✅ app/success/page.tsx - Tracks purchase conversions
✅ components/analytics/GoogleAds.tsx - Google Ads tag
✅ components/marketing/Hero.tsx - Tracks sign-up clicks
✅ components/marketing/Header.tsx - Tracks sign-up clicks
✅ lib/analytics.ts - Conversion tracking functions
✅ .env.example - Added NEXT_PUBLIC_GOOGLE_ADS_ID
```

### Conversion Tracking Points

1. **Purchase Conversion:**
   - Triggers: On `/success` page after Stripe payment
   - Data sent: Transaction ID, order value
   - File: `app/success/page.tsx`

2. **Sign-Up Conversion:**
   - Triggers: When "Start Free" button clicked
   - Locations:
     - Hero section (main CTA)
     - Header (desktop & mobile menu)
   - Files: `components/marketing/Hero.tsx`, `components/marketing/Header.tsx`

### Helper Functions

```typescript
// Track a purchase with transaction details
trackPurchase('stripe_session_123', 89, 'USD')

// Track a sign-up
trackSignUp()

// Track custom conversion
trackConversion('custom_event', 100)
```

## Troubleshooting

### Conversions Not Showing

**Check:**
1. ✅ `NEXT_PUBLIC_GOOGLE_ADS_ID` is set correctly
2. ✅ Conversion labels are correct (no typos)
3. ✅ Google Ads tag is loading (check Network tab)
4. ✅ Not using ad blocker
5. ✅ Wait 3-24 hours for data to appear

### Tag Not Loading

**Fix:**
```typescript
// Verify in browser console
console.log(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID)
// Should output: "AW-XXXXXXXXXX"

// Check if gtag exists
console.log(typeof window.gtag)
// Should output: "function"
```

### Testing in Development

Google Ads tracking works in development mode, but conversions won't be counted toward your actual metrics. Use Google Tag Assistant to debug locally.

## Best Practices

### DO:
- ✅ Track high-intent actions (purchase, sign-up)
- ✅ Use unique transaction IDs
- ✅ Include actual order values for ROAS tracking
- ✅ Exclude purchasers from remarketing ads
- ✅ Test conversions before launching ads

### DON'T:
- ❌ Track every button click (too noisy)
- ❌ Use same conversion label for multiple events
- ❌ Forget to update placeholder labels
- ❌ Skip testing in staging
- ❌ Show ads to recent purchasers

## Cost Optimization

### Expected Metrics (Crypto Tax Industry)

- **Cost Per Click (CPC):** $2-5
- **Conversion Rate:** 2-5%
- **Cost Per Acquisition (CPA):** $40-250
- **Return on Ad Spend (ROAS):** 2-4x

### Budget Recommendations

**Starter Budget:**
- $10/day = $300/month
- Expected: 5-10 conversions/month
- Revenue: $445-890 (assuming $89 Pro plan)

**Growth Budget:**
- $50/day = $1,500/month
- Expected: 25-50 conversions/month
- Revenue: $2,225-4,450

## Next Steps

1. ✅ Set up Google Ads account
2. ✅ Create conversion actions
3. ✅ Add environment variables
4. ✅ Update conversion labels
5. ✅ Link to Google Analytics
6. ✅ Test conversions
7. ✅ Create remarketing audiences
8. ✅ Launch your first campaign!

## Resources

- [Google Ads Conversion Tracking](https://support.google.com/google-ads/answer/1722022)
- [Link Google Ads to GA4](https://support.google.com/analytics/answer/9379420)
- [Remarketing Best Practices](https://support.google.com/google-ads/answer/2454000)
- [Tag Assistant](https://tagassistant.google.com/)

---

**Need Help?** Check your implementation with Google Tag Assistant or contact Google Ads support.
