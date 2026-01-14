import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createUpload } from '@/lib/uploads-db';
import { queryOne } from '@/lib/db';

// Custom domain doesn't need /prod prefix - it's mapped directly
const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'https://api.taxformatter.com';

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
    // Route: POST /confirm-upload (see backend/handlers/webhook.py)
    // Note: uploadId is the s3Key from presigned-url response
    // Extract jobId from the s3Key: uploads/{jobId}/filename.csv
    const parts = uploadId.split('/');
    const jobId = parts.length >= 2 ? parts[1] : uploadId;

    const lambdaResponse = await fetch(`${API_GATEWAY_URL}/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId,
        key: uploadId, // S3 key
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

    // 4. Persist to Neon database
    // Extract filename from S3 key: uploads/{jobId}/{filename}
    const s3KeyParts = uploadId.split('/');
    const filename = s3KeyParts.length >= 3 ? s3KeyParts.slice(2).join('/') : 'Unknown file';

    try {
      // Create upload record
      const upload = await createUpload(userId, filename, uploadId);

      // Create job record linked to upload
      await queryOne(
        `INSERT INTO jobs (id, upload_id, status)
         VALUES ($1, $2, 'queued')
         RETURNING *`,
        [data.jobId, upload.id]
      );

      console.log(`[Upload Confirm] Persisted upload ${upload.id} and job ${data.jobId} to DB`);
    } catch (dbError) {
      // Log but don't fail the request - Lambda processing will continue
      console.error('[Upload Confirm] Failed to persist to DB:', dbError);
    }

    // 5. Return job details
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
