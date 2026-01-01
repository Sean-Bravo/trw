import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'https://in4wj9vldj.execute-api.us-east-1.amazonaws.com';

/**
 * POST /api/uploads/[uploadId]/confirm
 * Proxies to AWS Lambda to confirm upload and create processing job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
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

    const userId = session.user.id;
    const { uploadId } = await params;

    // 2. Parse request body
    const body = await request.json();
    const { etag } = body;

    // 3. Call AWS Lambda via API Gateway
    // Note: uploadId is the s3Key from presigned-url response
    const lambdaResponse = await fetch(`${API_GATEWAY_URL}/upload/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        s3Key: uploadId, // uploadId is actually the s3Key
        userId,
        fileSha256: etag, // Use etag as file hash for now
      }),
    });

    if (!lambdaResponse.ok) {
      const errorData = await lambdaResponse.json().catch(() => ({}));
      console.error('[Upload Confirm] Lambda error:', errorData);

      if (lambdaResponse.status === 429) {
        return NextResponse.json(
          { error: errorData.error || 'Rate limit exceeded' },
          {
            status: 429,
            headers: { 'Retry-After': '3600' }
          }
        );
      }

      return NextResponse.json(
        { error: errorData.error || 'Failed to confirm upload' },
        { status: lambdaResponse.status }
      );
    }

    const data = await lambdaResponse.json();

    console.log(`[Upload Confirm] Created job ${data.jobId} for user ${userId}`);

    // 4. Return job details
    return NextResponse.json({
      jobId: data.jobId,
      uploadId: data.uploadId,
      status: data.status || 'queued',
      jobsRemainingThisHour: 'unlimited', // TODO: Get from Lambda
    });

  } catch (error) {
    console.error('[Upload Confirm] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
