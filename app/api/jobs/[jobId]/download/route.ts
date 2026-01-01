import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'https://in4wj9vldj.execute-api.us-east-1.amazonaws.com';

/**
 * GET /api/jobs/[jobId]/download
 * Get download URL for completed job from AWS Lambda
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { jobId } = await params;

    // Get file type from query params (formatted or flagged)
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'formatted';

    // 2. Call AWS Lambda via API Gateway
    const lambdaResponse = await fetch(
      `${API_GATEWAY_URL}/job/download-url?jobId=${encodeURIComponent(jobId)}&type=${encodeURIComponent(type)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!lambdaResponse.ok) {
      const errorData = await lambdaResponse.json().catch(() => ({}));
      console.error('[Download URL] Lambda error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to get download URL' },
        { status: lambdaResponse.status }
      );
    }

    const data = await lambdaResponse.json();

    // 3. Return download URL
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Download URL] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
