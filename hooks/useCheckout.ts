'use client'

import { useState } from 'react'

export type ApiTier = 'starter' | 'growth' | 'business'

export function useCheckout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkout = async (tier: ApiTier, apiKeyId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/developer/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier, apiKeyId }),
      })

      const data = await response.json()

      if (response.status === 401) {
        window.location.href = `/signup?plan=${tier}`
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return { checkout, loading, error }
}
