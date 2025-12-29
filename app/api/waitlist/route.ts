import { NextRequest, NextResponse } from 'next/server'
import { captureException, setContext } from '@/lib/sentry'

// Temporary storage in-memory (will be replaced with Mailchimp tonight)
// In production, this will be replaced with Mailchimp API integration
const waitlistEmails = new Set<string>()

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

    // TODO: Replace with Mailchimp API integration
    // For now, just store in-memory and log
    waitlistEmails.add(email.toLowerCase())
    console.log(`✅ Waitlist signup: ${email}`)
    console.log(`📊 Total waitlist signups: ${waitlistEmails.size}`)

    // When Mailchimp is set up, replace with:
    /*
    const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY
    const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX
    const MAILCHIMP_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID

    const response = await fetch(
      `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`anystring:${MAILCHIMP_API_KEY}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: email,
          status: 'subscribed',
          tags: ['waitlist', 'q1-2026'],
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to add to Mailchimp')
    }
    */

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the waitlist!',
    })
  } catch (error: any) {
    console.error('Waitlist error:', error)

    // Send error to Sentry
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
