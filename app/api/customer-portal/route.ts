import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getServerSession } from 'next-auth'
import { queryOne, execute } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in' },
        { status: 401 }
      )
    }

    // Look up stripe_customer_id from DB first
    const user = await queryOne<{ id: string; stripe_customer_id: string | null }>(
      `SELECT id, stripe_customer_id FROM users WHERE email = $1`,
      [session.user.email]
    )

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    let customerId = user.stripe_customer_id

    // Fallback: create customer in Stripe and persist to DB
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
      })
      customerId = customer.id
      await execute(
        `UPDATE users SET stripe_customer_id = $1 WHERE id = $2`,
        [customerId, user.id]
      )
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'}/dashboard/developer`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    console.error('Customer portal error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
