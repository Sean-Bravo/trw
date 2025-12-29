# Mailchimp Waitlist Setup Guide

Quick guide to connect your waitlist form to Mailchimp tonight.

## 1. Create Mailchimp Account

1. Go to [mailchimp.com](https://mailchimp.com)
2. Sign up for a free account (up to 500 contacts free)
3. Verify your email

## 2. Create an Audience (Mailing List)

1. In Mailchimp dashboard, go to **Audience → All contacts**
2. Click **Create Audience** (or use the default one)
3. Fill in:
   - Audience name: "TaxReadyWallet Waitlist"
   - Default from email: your-email@domain.com
   - Default from name: TaxReadyWallet
4. Click **Save**

## 3. Get Your Audience ID

1. Go to **Audience → All contacts → Settings → Audience name and defaults**
2. Look for **Audience ID** (looks like: `a1b2c3d4e5`)
3. Copy this ID - you'll need it

## 4. Create an API Key

1. Click your profile icon → **Account & billing**
2. Go to **Extras → API keys**
3. Click **Create A Key**
4. Give it a name: "TaxReadyWallet Waitlist"
5. Copy the API key (looks like: `abc123def456-us21`)
6. Note the server prefix (the part after the dash, e.g., `us21`)

## 5. Add Environment Variables

Add these to your `.env.local` (development) and Vercel (production):

```bash
# Mailchimp Configuration
MAILCHIMP_API_KEY=abc123def456-us21
MAILCHIMP_SERVER_PREFIX=us21
MAILCHIMP_AUDIENCE_ID=a1b2c3d4e5
```

**How to find server prefix:**
- It's the last part of your API key after the dash
- Examples: `us1`, `us21`, `us6`, etc.
- Also visible in your Mailchimp dashboard URL

## 6. Update the API Route

Replace the TODO section in `/app/api/waitlist/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { captureException, setContext } from '@/lib/sentry'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Mailchimp API integration
    const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY
    const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX
    const MAILCHIMP_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID

    if (!MAILCHIMP_API_KEY || !MAILCHIMP_SERVER_PREFIX || !MAILCHIMP_AUDIENCE_ID) {
      console.error('Mailchimp environment variables not configured')
      // Still log the email locally
      console.log(`✅ Waitlist signup (Mailchimp not configured): ${email}`)
      return NextResponse.json({ success: true })
    }

    const response = await fetch(
      `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`anystring:${MAILCHIMP_API_KEY}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: email.toLowerCase(),
          status: 'subscribed',
          tags: ['waitlist', 'q1-2026', 'pre-launch'],
          merge_fields: {
            SOURCE: 'Website Footer',
            SIGNUP: new Date().toISOString(),
          },
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      // Handle "Member Exists" error gracefully
      if (data.title === 'Member Exists') {
        return NextResponse.json({
          success: true,
          message: 'You\'re already on the waitlist!',
        })
      }

      throw new Error(data.detail || 'Failed to add to Mailchimp')
    }

    console.log(`✅ Added to Mailchimp waitlist: ${email}`)

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the waitlist!',
    })
  } catch (error: any) {
    console.error('Waitlist error:', error)

    setContext('waitlist', {
      endpoint: '/api/waitlist',
    })
    captureException(error)

    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again.' },
      { status: 500 }
    )
  }
}
```

## 7. Test the Integration

### Local Testing

```bash
# Add env vars to .env.local
MAILCHIMP_API_KEY=your-key-here
MAILCHIMP_SERVER_PREFIX=us21
MAILCHIMP_AUDIENCE_ID=your-audience-id

# Restart your dev server
npm run dev

# Test the form in your browser
# Check Mailchimp dashboard to see if the email appears
```

### Using curl

```bash
curl -X POST http://localhost:3000/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 8. Create Welcome Email (Optional)

Set up an automated welcome email in Mailchimp:

1. Go to **Automations → Create → Welcome new subscribers**
2. Choose your audience
3. Customize the email:
   - Subject: "You're on the waitlist! 🎉"
   - Content: Thank them for joining, mention Q1 2026 launch, offer early bird discount

## 9. Create Tags for Organization

In Mailchimp, tag your subscribers:

- `waitlist` - All waitlist signups
- `q1-2026` - Launch cohort
- `pre-launch` - Before launch signups
- `early-bird` - Eligible for launch discount

These tags are automatically added by the API route.

## 10. Vercel Deployment

Add environment variables in Vercel:

1. Go to Project Settings → Environment Variables
2. Add for **Production**, **Preview**, and **Development**:
   ```
   MAILCHIMP_API_KEY=abc123...
   MAILCHIMP_SERVER_PREFIX=us21
   MAILCHIMP_AUDIENCE_ID=a1b2c3d4e5
   ```
3. Redeploy your site

## Troubleshooting

### Error: "Invalid Resource"
- Check your Audience ID is correct
- Make sure you're using the right server prefix

### Error: "API Key Invalid"
- Verify the API key is copied correctly
- Ensure there are no extra spaces
- Check the key hasn't been deleted in Mailchimp

### Error: "Member Exists"
- This is handled gracefully in the code
- User will see "You're already on the waitlist!"

### Emails not appearing in Mailchimp
- Check your server prefix matches your API key
- Verify the Audience ID is correct
- Check Mailchimp dashboard under **Audience → All contacts**
- Look in the **Archived** or **Cleaned** sections

## Cost

**Free Tier:**
- Up to 500 contacts
- 1,000 email sends per month
- Perfect for waitlist!

**Paid Plans:**
- Start at $13/month for 500+ contacts
- Only upgrade when you exceed free tier

## Monitoring

Track waitlist growth:
1. Mailchimp dashboard shows total subscribers
2. Check tags to see sources
3. Use Mailchimp reports for engagement metrics
4. Export email list anytime for backup

## Next Steps After Setup

1. **Create Launch Email Campaign**
   - Draft email announcing launch
   - Schedule for launch day
   - Include special early bird pricing

2. **Create Email Sequence**
   - Welcome email (immediate)
   - Update email at 1 month before launch
   - Launch announcement
   - Tutorial/onboarding series

3. **Track Conversions**
   - Add UTM parameters to launch email links
   - Track how many waitlist users convert to paid

## Resources

- [Mailchimp API Documentation](https://mailchimp.com/developer/marketing/api/)
- [Mailchimp Audience Management](https://mailchimp.com/help/manage-audience/)
- [Mailchimp Automations](https://mailchimp.com/help/getting-started-with-automations/)

---

**Remember:** The waitlist form works NOW with temporary logging. Add Mailchimp tonight to store emails permanently!
