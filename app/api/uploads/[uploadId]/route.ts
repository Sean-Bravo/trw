import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { queryOne, execute } from '@/lib/db';

// Custom domain doesn't need /prod prefix - it's mapped directly
const API_GATEWAY_URL = process.env['API_GATEWAY_URL'] || 'https://api.taxformatter.com';

interface UploadRecord {
  id: string;
  user_id: string;
  s3_key: string;
  deleted_at: Date | null;
}

/**
 * DELETE /api/uploads/[uploadId]
 * Permanently delete user's uploaded file from storage.
 * Metadata row is preserved with deleted_at timestamp.
 */
export async function DELETE(
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

    // 2. Verify ownership and get upload details
    const upload = await queryOne<UploadRecord>(
      `SELECT id, user_id, s3_key, deleted_at FROM uploads WHERE id = $1`,
      [uploadId]
    );

    if (!upload) {
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      );
    }

    if (upload.user_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to delete this upload' },
        { status: 403 }
      );
    }

    // 3. Check if already deleted
    if (upload.deleted_at) {
      return NextResponse.json(
        {
          status: 'already_deleted',
          deleted_at: upload.deleted_at,
          metadata_retained: true
        }
      );
    }

    // 4. Delete from S3 via Lambda
    // Extract jobId from s3_key: uploads/{jobId}/filename.csv
    const s3KeyParts = upload.s3_key.split('/');
    const jobId = s3KeyParts.length >= 2 ? s3KeyParts[1] : null;

    if (jobId) {
      try {
        const lambdaResponse = await fetch(`${API_GATEWAY_URL}/delete/${encodeURIComponent(jobId)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!lambdaResponse.ok) {
          // Log but don't fail - we still want to mark as deleted in DB
          const errorData = await lambdaResponse.json().catch(() => ({}));
          console.error('[Upload Delete] Lambda error:', errorData);
        }
      } catch (lambdaError) {
        // Log but don't fail the request
        console.error('[Upload Delete] Failed to call Lambda:', lambdaError);
      }
    }

    // 5. Mark as deleted in database (soft delete - preserve metadata)
    await execute(
      `UPDATE uploads
       SET deleted_at = NOW(),
           deletion_type = 'user_requested',
           updated_at = NOW()
       WHERE id = $1`,
      [uploadId]
    );

    console.log(`[Upload Delete] User ${userId} deleted upload ${uploadId}`);

    // 6. Return confirmation
    return NextResponse.json({
      status: 'deleted',
      uploadId,
      metadata_retained: true,
      message: 'File permanently deleted. Anonymized processing metadata retained.'
    });

  } catch (error) {
    console.error('[Upload Delete] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
