import { NextRequest, NextResponse } from 'next/server'
import { captureException, setContext } from '@/lib/sentry'
import { addSubscriber, describeMailchimpError, isMailchimpConfigured } from '@/lib/mailchimp'
import { validateEmail } from '@/lib/validation'

// RFC 5321 caps an address at 254 chars. Checked before any regex so an
// unauthenticated body can't feed the validator a megabyte string.
const MAX_EMAIL_LENGTH = 254

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

    const validation: ReturnType<typeof validateEmail> =
      email.length <= MAX_EMAIL_LENGTH ? validateEmail(email) : { success: false }
    if (!validation.success || !validation.data) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }
    const validatedEmail = validation.data

    // 2. Check Configuration (Failsafe for dev environment)
    if (!isMailchimpConfigured()) {
      console.warn('⚠️ Mailchimp not configured in .env. Logging to console:', validatedEmail)
      // Return success in dev so the UI doesn't break
      return NextResponse.json({
        success: true,
        message: 'Joined waitlist (Dev Mode)',
      })
    }

    // 3. Send to Mailchimp
    const result = await addSubscriber(validatedEmail, {
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
    // Never pass the raw SDK error on: it carries the API key in its request headers
    const safe = describeMailchimpError(error)
    console.error('Waitlist error:', safe)

    // Send context to Sentry for easier debugging
    setContext('waitlist', {
      endpoint: '/api/waitlist',
      email_attempt: 'hidden-for-privacy'
    })
    // `detail` is left out: Mailchimp often echoes the submitted email in it
    captureException(new Error(
      `Waitlist signup failed: ${[safe.status, safe.title, safe.message].filter(Boolean).join(' ')}`
    ))

    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again.' },
      { status: 500 }
    )
  }
}