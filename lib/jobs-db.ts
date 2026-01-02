import { execute, queryOne, query, DbJob, DbUpload } from './db';

/**
 * Get job by ID with upload info
 */
export async function getJobById(jobId: string): Promise<(DbJob & { upload: DbUpload }) | null> {
  const result = await queryOne<DbJob & {
    upload_filename: string;
    upload_s3_key: string;
    upload_status: string;
    upload_user_id: string;
  }>(
    `SELECT j.*,
            u.filename as upload_filename,
            u.s3_key as upload_s3_key,
            u.status as upload_status,
            u.user_id as upload_user_id
     FROM jobs j
     JOIN uploads u ON u.id = j.upload_id
     WHERE j.id = $1`,
    [jobId]
  );

  if (!result) return null;

  return {
    ...result,
    upload: {
      id: result.upload_id,
      user_id: result.upload_user_id,
      filename: result.upload_filename,
      s3_key: result.upload_s3_key,
      status: result.upload_status as DbUpload['status'],
      file_size: null,
      created_at: result.created_at,
      updated_at: result.created_at,
    },
  };
}

/**
 * Get jobs by user ID
 */
export async function getJobsByUserId(userId: string): Promise<DbJob[]> {
  return query<DbJob>(
    `SELECT j.*
     FROM jobs j
     JOIN uploads u ON u.id = j.upload_id
     WHERE u.user_id = $1
     ORDER BY j.created_at DESC`,
    [userId]
  );
}

/**
 * Create a new job for an upload
 */
export async function createJob(uploadId: string): Promise<DbJob> {
  const result = await queryOne<DbJob>(
    `INSERT INTO jobs (upload_id, status)
     VALUES ($1, 'queued')
     RETURNING *`,
    [uploadId]
  );

  if (!result) {
    throw new Error('Failed to create job');
  }

  return result;
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string,
  status: DbJob['status'],
  result?: Record<string, unknown>,
  error?: string
): Promise<void> {
  const updates: string[] = ['status = $2'];
  const params: unknown[] = [jobId, status];
  let paramIndex = 3;

  if (status === 'running') {
    updates.push(`started_at = now()`);
  }

  if (status === 'succeeded' || status === 'failed' || status === 'canceled') {
    updates.push(`finished_at = now()`);
  }

  if (result !== undefined) {
    updates.push(`result = $${paramIndex}`);
    params.push(JSON.stringify(result));
    paramIndex++;
  }

  if (error !== undefined) {
    updates.push(`error = $${paramIndex}`);
    params.push(error);
    paramIndex++;
  }

  await execute(
    `UPDATE jobs SET ${updates.join(', ')} WHERE id = $1`,
    params
  );
}

/**
 * Get user stats (upload count, completed, processing)
 */
export async function getUserStats(userId: string): Promise<{
  totalUploads: number;
  completed: number;
  processing: number;
}> {
  const result = await queryOne<{
    total_uploads: string;
    completed: string;
    processing: string;
  }>(
    `SELECT
       COUNT(DISTINCT u.id) as total_uploads,
       COUNT(DISTINCT CASE WHEN j.status = 'succeeded' THEN j.id END) as completed,
       COUNT(DISTINCT CASE WHEN j.status IN ('queued', 'running') THEN j.id END) as processing
     FROM uploads u
     LEFT JOIN jobs j ON j.upload_id = u.id
     WHERE u.user_id = $1`,
    [userId]
  );

  return {
    totalUploads: parseInt(result?.total_uploads || '0', 10),
    completed: parseInt(result?.completed || '0', 10),
    processing: parseInt(result?.processing || '0', 10),
  };
}
