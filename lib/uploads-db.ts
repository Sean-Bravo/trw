import { execute, queryOne, query, DbUpload, DbJob } from './db';

/**
 * Create a new upload record
 */
export async function createUpload(
  userId: string,
  filename: string,
  s3Key: string,
  fileSize?: number
): Promise<DbUpload> {
  const result = await queryOne<DbUpload>(
    `INSERT INTO uploads (user_id, filename, s3_key, file_size, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [userId, filename, s3Key, fileSize || null]
  );

  if (!result) {
    throw new Error('Failed to create upload');
  }

  return result;
}

/**
 * Get upload by ID
 */
export async function getUploadById(uploadId: string): Promise<DbUpload | null> {
  return queryOne<DbUpload>(
    `SELECT * FROM uploads WHERE id = $1`,
    [uploadId]
  );
}

/**
 * Get upload by S3 key
 */
export async function getUploadByS3Key(s3Key: string): Promise<DbUpload | null> {
  return queryOne<DbUpload>(
    `SELECT * FROM uploads WHERE s3_key = $1`,
    [s3Key]
  );
}

/**
 * Get uploads by user ID
 */
export async function getUploadsByUserId(userId: string): Promise<DbUpload[]> {
  return query<DbUpload>(
    `SELECT * FROM uploads WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
}

/**
 * Update upload status
 */
export async function updateUploadStatus(
  uploadId: string,
  status: DbUpload['status']
): Promise<void> {
  await execute(
    `UPDATE uploads SET status = $2, updated_at = now() WHERE id = $1`,
    [uploadId, status]
  );
}

/**
 * Get uploads with jobs for a user (for dashboard)
 */
export async function getUploadsWithJobs(userId: string): Promise<(DbUpload & { job?: DbJob })[]> {
  const results = await query<DbUpload & {
    job_id: string | null;
    job_status: DbJob['status'] | null;
    job_result: Record<string, unknown> | null;
    job_error: string | null;
    job_created_at: Date | null;
    job_started_at: Date | null;
    job_finished_at: Date | null;
  }>(
    `SELECT
       u.*,
       j.id as job_id,
       j.status as job_status,
       j.result as job_result,
       j.error as job_error,
       j.created_at as job_created_at,
       j.started_at as job_started_at,
       j.finished_at as job_finished_at
     FROM uploads u
     LEFT JOIN jobs j ON j.upload_id = u.id
     WHERE u.user_id = $1
     ORDER BY u.created_at DESC`,
    [userId]
  );

  return results.map(row => ({
    id: row.id,
    user_id: row.user_id,
    filename: row.filename,
    s3_key: row.s3_key,
    status: row.status,
    file_size: row.file_size,
    created_at: row.created_at,
    updated_at: row.updated_at,
    job: row.job_id ? {
      id: row.job_id,
      upload_id: row.id,
      status: row.job_status!,
      result: row.job_result,
      error: row.job_error,
      created_at: row.job_created_at!,
      started_at: row.job_started_at,
      finished_at: row.job_finished_at,
    } : undefined,
  }));
}

/**
 * Count uploads for a user (for rate limiting)
 */
export async function countUserUploadsInPeriod(
  userId: string,
  periodHours: number = 24
): Promise<number> {
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM uploads
     WHERE user_id = $1
       AND created_at > now() - interval '1 hour' * $2`,
    [userId, periodHours]
  );

  return parseInt(result?.count || '0', 10);
}
