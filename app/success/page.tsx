'use client'

import Link from 'next/link'
import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { trackPurchase } from '@/lib/analytics'

function SuccessContent() {
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get session_id from URL (Stripe redirects with this)
    const sessionId = searchParams.get('session_id')

    if (sessionId) {
      // Track the purchase conversion
      // You can get the actual amount from Stripe webhook or session data
      // For now, we'll track with a default value
      trackPurchase(sessionId, 29) // Default to Starter API tier price
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-gray-50 flex items-center justify-center py-12">
      <Container>
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <div className="rounded-full bg-green-100 p-6">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>

          <p className="text-xl text-gray-600 mb-8">
            Thank you for your purchase. Your payment has been processed successfully.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              What's Next?
            </h2>
            <p className="text-gray-700 mb-4">
              You should receive a confirmation email shortly with your receipt and access details.
            </p>
            <p className="text-sm text-gray-600">
              If you have any questions, please check our documentation or contact support.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              View Documentation
            </Link>
          </div>
        </div>
      </Container>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="rounded-full bg-green-100 p-6 inline-block mb-4">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Loading...</h1>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
