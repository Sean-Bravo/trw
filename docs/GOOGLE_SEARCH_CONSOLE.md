# Google Search Console Setup for taxformatter.com

## Step 1: Add Property

1. Go to https://search.google.com/search-console
2. Click "Add property"
3. Choose **URL prefix** method: `https://taxformatter.com`
4. You'll be asked to verify ownership (see Step 2)

## Step 2: Verify Ownership

**Recommended method: DNS TXT record** (works best with Vercel)

1. Google will give you a TXT record like: `google-site-verification=XXXXXXXXXXXX`
2. In your DNS provider (Vercel, Cloudflare, or whoever manages taxformatter.com DNS):
   - Add a TXT record to `@` (root domain) with the verification string
3. Click "Verify" in Search Console
4. Verification may take a few minutes to propagate

**Alternative method: HTML meta tag**

If you prefer, add the meta tag to `app/layout.tsx`:

```tsx
export const metadata: Metadata = {
  // ... existing metadata
  verification: {
    google: 'YOUR_VERIFICATION_CODE_HERE',
  },
};
```

Next.js will render this as `<meta name="google-site-verification" content="...">`.

## Step 3: Submit Sitemap

1. In Search Console, go to "Sitemaps" in the left sidebar
2. Enter: `sitemap.xml`
3. Click "Submit"

Your sitemap is auto-generated at `https://taxformatter.com/sitemap.xml` by `app/sitemap.ts`. It includes all blog posts, docs, and main pages.

## Step 4: Request Indexing for Key Pages

After verification, go to "URL Inspection" and manually request indexing for:

1. `https://taxformatter.com` (landing page)
2. `https://taxformatter.com/blog` (blog index)
3. `https://taxformatter.com/docs/api` (API docs)
4. `https://taxformatter.com/upload` (free tool — high-conversion page)

For each URL: paste it in the inspection bar, wait for the check, then click "Request Indexing."

## Step 5: Monitor (Weekly)

Check these weekly for the first month:

- **Coverage report**: Look for errors (404s, server errors, redirect chains)
- **Sitemaps**: Confirm all pages are discovered and indexed
- **Performance**: Track clicks, impressions, CTR, and average position
- **Core Web Vitals**: Check for any performance issues flagged

## What's Already Set Up

- `app/sitemap.ts` — Auto-generates sitemap from Contentlayer (blog + docs)
- `app/robots.ts` — Allows all crawlers, blocks `/api/` and `/private/`
- JSON-LD structured data on all pages (Organization, WebSite, SoftwareApplication, WebAPI, Article, Breadcrumb, HowTo, FAQ schemas)
- Canonical URLs via Next.js metadata
- Open Graph and Twitter meta tags on all pages
- `noindex` on `/upload` page (Google Ads landing page)

## Note on /upload Page

The `/upload` page has `noindex` because it's a Google Ads landing page. If you want it indexed for organic search too, remove the noindex directive. However, if you're running ads to it, keeping noindex prevents duplicate content issues between the organic landing page and the ads landing page.
