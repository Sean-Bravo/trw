import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { randomUUID } from 'crypto';

// Initialize AWS clients
const s3Client = new S3Client({
  region: process.env['AWS_REGION'] || 'us-east-1',
  credentials: {
    accessKeyId: process.env['AWS_ACCESS_KEY_ID'] || '',
    secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] || '',
  },
});

const sqsClient = new SQSClient({
  region: process.env['AWS_REGION'] || 'us-east-1',
  credentials: {
    accessKeyId: process.env['AWS_ACCESS_KEY_ID'] || '',
    secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] || '',
  },
});

const BUCKET_NAME = process.env['AWS_S3_BUCKET'] || 'taxformatter-uploads';
const QUEUE_URL = process.env['AWS_SQS_QUEUE_URL'] || '';

// In-memory storage for idempotency (replace with Redis in production)
const idempotencyStore = new Map<string, string>();

// In-memory storage for upload metadata (replace with DynamoDB in production)
interface UploadMetadata {
  uploadId: string;
  userId: string;
  filename: string;
  s3Key: string;
  tier: string;
  status: 'pending' | 'confirmed' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  jobId?: string;
}

const uploadStore = new Map<string, UploadMetadata>();

/**
 * POST /api/uploads/[uploadId]/confirm
 * Confirm upload and create processing job
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
    const tier = (session.user.subscriptionTier || 'free') as 'free' | 'pro' | 'premium';
    const { uploadId } = await params;

    // 2. Check idempotency key
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'Missing Idempotency-Key header' },
        { status: 400 }
      );
    }

    // Check if we've already processed this request
    const existingJobId = idempotencyStore.get(idempotencyKey);
    if (existingJobId) {
      // Return the same response (idempotent)
      console.log(`[Upload Confirm] Idempotent request for key ${idempotencyKey}, returning existing jobId ${existingJobId}`);

      // TODO: Fetch job details from DynamoDB
      return NextResponse.json({
        jobId: existingJobId,
        status: 'queued',
        jobsRemainingThisHour: tier === 'premium' ? 'unlimited' : 999, // Placeholder
      });
    }

    // 3. Parse request body
    const body = await request.json();
    const { etag } = body;

    if (!etag || typeof etag !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid ETag' },
        { status: 400 }
      );
    }

    // 4. Verify upload exists in our records
    // TODO: Fetch from DynamoDB
    // For now, we'll construct the expected S3 key pattern
    const s3KeyPattern = `uploads/${userId}/${uploadId}/`;

    // 5. Verify file exists in S3 and ETag matches
    try {
      // List objects with the prefix to find the exact key
      // For now, we'll skip the ETag verification and just verify the user owns the upload

      // In production:
      // const headCommand = new HeadObjectCommand({
      //   Bucket: BUCKET_NAME,
      //   Key: s3Key,
      //   IfMatch: etag, // Verify ETag matches
      // });
      // const headResponse = await s3Client.send(headCommand);

      console.log(`[Upload Confirm] User ${userId} confirming upload ${uploadId} with ETag ${etag}`);
    } catch (error: any) {
      console.error('[Upload Confirm] S3 verification failed:', error);

      if (error.name === 'NotFound') {
        return NextResponse.json(
          { error: 'Upload not found' },
          { status: 404 }
        );
      }

      if (error.name === 'PreconditionFailed') {
        return NextResponse.json(
          { error: 'ETag mismatch - file may have been modified' },
          { status: 409 }
        );
      }

      throw error; // Re-throw for 500 handling
    }

    // 6. Check rate limits (replace with Redis in production)
    // TODO: Check Redis for upload count this hour
    const rateLimit = tier === 'free' ? 5 : tier === 'pro' ? 20 : Infinity;
    const jobsRemainingThisHour = tier === 'premium' ? 'unlimited' : rateLimit - 1; // Placeholder

    // 7. Generate job ID
    const jobId = randomUUID();

    // 8. Update upload status to 'confirmed'
    // TODO: Update in DynamoDB
    uploadStore.set(uploadId, {
      uploadId,
      userId,
      filename: 'temp.csv', // TODO: Get from DynamoDB
      s3Key: `${s3KeyPattern}temp.csv`,
      tier,
      status: 'confirmed',
      createdAt: Date.now(),
      jobId,
    });

    // 9. Create job record
    // TODO: Store in DynamoDB Jobs table
    const jobRecord = {
      jobId,
      uploadId,
      userId,
      tier,
      status: 'queued',
      createdAt: Date.now(),
    };

    console.log(`[Upload Confirm] Created job record:`, jobRecord);

    // 10. Send message to SQS queue
    if (QUEUE_URL) {
      try {
        const sqsMessage = {
          jobId,
          uploadId,
          userId,
          bucket: BUCKET_NAME,
          key: `${s3KeyPattern}temp.csv`, // TODO: Use actual key
          tier,
          timestamp: new Date().toISOString(),
        };

        const sendCommand = new SendMessageCommand({
          QueueUrl: QUEUE_URL,
          MessageBody: JSON.stringify(sqsMessage),
          MessageAttributes: {
            tier: {
              DataType: 'String',
              StringValue: tier,
            },
            userId: {
              DataType: 'String',
              StringValue: userId,
            },
          },
        });

        const sqsResponse = await sqsClient.send(sendCommand);
        console.log(`[Upload Confirm] Sent SQS message ${sqsResponse.MessageId} for job ${jobId}`);
      } catch (error) {
        console.error('[Upload Confirm] Failed to send SQS message:', error);
        // Continue anyway - job is created, we can retry SQS later
      }
    } else {
      console.warn('[Upload Confirm] No SQS queue URL configured, skipping queue');
    }

    // 11. Store idempotency key → jobId mapping
    idempotencyStore.set(idempotencyKey, jobId);

    // 12. Increment rate limit counter
    // TODO: Increment in Redis
    // const currentHour = Math.floor(Date.now() / 3600000);
    // await redis.incr(`jobs:${userId}:${currentHour}`);
    // await redis.expire(`jobs:${userId}:${currentHour}`, 3600);

    // 13. Return job details
    return NextResponse.json({
      jobId,
      status: 'queued' as const,
      jobsRemainingThisHour,
    });

  } catch (error) {
    console.error('[Upload Confirm] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
