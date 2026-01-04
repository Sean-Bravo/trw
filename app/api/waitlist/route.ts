import { NextRequest, NextResponse } from 'next/server'
import { captureException, setContext } from '@/lib/sentry'
import { addSubscriber, isMailchimpConfigured } from '@/lib/mailchimp'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // 1. Validate Input
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

    // 2. Check Configuration (Failsafe for dev environment)
    if (!isMailchimpConfigured()) {
      console.warn('⚠️ Mailchimp not configured in .env. Logging to console:', email)
      // Return success in dev so the UI doesn't break
      return NextResponse.json({
        success: true,
        message: 'Joined waitlist (Dev Mode)',
      })
    }

    // 3. Send to Mailchimp
    const result = await addSubscriber(email, {
      tags: ['waitlist', 'pre-launch'], 
      mergeFields: {
        SOURCE: 'Footer Waitlist' 
      }
    })

    // 4. Handle "Already Exists" gracefully
    if (result.alreadySubscribed) {
      return NextResponse.json({
        success: true,
        message: "You're already on the list!",
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the waitlist!',
    })

  } catch (error: any) {
    console.error('Waitlist error:', error)

    // Send context to Sentry for easier debugging
    setContext('waitlist', {
      endpoint: '/api/waitlist',
      email_attempt: 'hidden-for-privacy'
    })
    captureException(error)

    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again.' },
      { status: 500 }
    )
  }
}