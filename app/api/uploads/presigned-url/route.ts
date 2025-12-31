import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { randomUUID } from 'crypto';

// Tier-based limits (in bytes)
const TIER_LIMITS = {
  free: 50 * 1024 * 1024,      // 50MB
  pro: 500 * 1024 * 1024,      // 500MB
  premium: 2 * 1024 * 1024 * 1024, // 2GB
} as const;

// Rate limits (uploads per hour)
const RATE_LIMITS = {
  free: 5,
  pro: 20,
  premium: Infinity, // unlimited
} as const;

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env['AWS_REGION'] || 'us-east-1',
  credentials: {
    accessKeyId: process.env['AWS_ACCESS_KEY_ID'] || '',
    secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] || '',
  },
});

const BUCKET_NAME = process.env['AWS_S3_BUCKET'] || 'taxformatter-uploads';
const KMS_KEY_ID = process.env['AWS_KMS_KEY_ID']; // Optional - will use if provided

/**
 * POST /api/uploads/presigned-url
 * Generate a presigned POST URL for S3 upload
 */
export async function POST(request: NextRequest) {
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
    const tier = (session.user.subscriptionTier || 'free') as keyof typeof TIER_LIMITS;

    // 2. Parse request body
    const body = await request.json();
    const { filename, fileSize } = body;

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid filename' },
        { status: 400 }
      );
    }

    if (!fileSize || typeof fileSize !== 'number' || fileSize <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid file size' },
        { status: 400 }
      );
    }

    // 3. Validate file extension
    if (!filename.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      );
    }

    // 4. Check file size against tier limit
    const maxSize = TIER_LIMITS[tier];
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds your tier limit. Upgrade for larger files.' },
        { status: 413 }
      );
    }

    // 5. Check rate limits (in-memory for now - replace with Redis in production)
    // TODO: Replace with Redis-based rate limiting
    // For now, we'll skip rate limiting in development
    const rateLimit = RATE_LIMITS[tier];

    // In production, you would do:
    // const uploadCount = await redis.get(`uploads:${userId}:${currentHour}`);
    // if (uploadCount >= rateLimit) {
    //   return NextResponse.json(
    //     { error: 'Rate limit exceeded', jobsRemainingThisHour: 0 },
    //     {
    //       status: 429,
    //       headers: { 'Retry-After': String(3600 - (Date.now() % 3600000) / 1000) }
    //     }
    //   );
    // }

    // 6. Generate upload ID and S3 key
    const uploadId = randomUUID();
    const timestamp = Date.now();
    const s3Key = `uploads/${userId}/${uploadId}/${filename}`;

    // 7. Create presigned POST URL
    const presignedPost = await createPresignedPost(s3Client, {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Conditions: [
        ['content-length-range', 0, maxSize], // Enforce size limit
        ['starts-with', '$Content-Type', 'text/'], // CSV files only
      ],
      Fields: {
        'Content-Type': 'text/csv',
        // Add KMS encryption if key is provided
        ...(KMS_KEY_ID && {
          'x-amz-server-side-encryption': 'aws:kms',
          'x-amz-server-side-encryption-aws-kms-key-id': KMS_KEY_ID,
        }),
        // Add metadata
        'x-amz-meta-user-id': userId,
        'x-amz-meta-upload-id': uploadId,
        'x-amz-meta-original-filename': filename,
        'x-amz-meta-tier': tier,
      },
      Expires: 3600, // 1 hour expiration
    });

    // 8. Store upload metadata (in-memory for now - replace with DynamoDB in production)
    // TODO: Store in DynamoDB
    // await dynamoDB.put({
    //   TableName: 'Uploads',
    //   Item: {
    //     uploadId,
    //     userId,
    //     filename,
    //     fileSize,
    //     s3Key,
    //     tier,
    //     status: 'pending',
    //     createdAt: timestamp,
    //   }
    // });

    // 9. Increment rate limit counter (in-memory for now)
    // TODO: Increment in Redis
    // const currentHour = Math.floor(Date.now() / 3600000);
    // await redis.incr(`uploads:${userId}:${currentHour}`);
    // await redis.expire(`uploads:${userId}:${currentHour}`, 3600);

    console.log(`[Presigned URL] Generated for user ${userId}, upload ${uploadId}, file ${filename}`);

    // 10. Return presigned POST URL
    return NextResponse.json({
      presignedPost,
      uploadId,
      maxSize,
    });

  } catch (error) {
    console.error('[Presigned URL] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
