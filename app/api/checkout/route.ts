import { NextRequest, NextResponse } from 'next/server'

// Consumer checkout is deprecated — all billing flows through /api/developer/subscribe
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Consumer plans have been removed. Use /api/developer/subscribe for API tier billing.' },
    { status: 410 }
  )
}
