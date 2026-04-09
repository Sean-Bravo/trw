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
  // H-13: previously this function built the UPDATE SET clause from a
  // string array. The fragments were all hardcoded so today there was no
  // SQL injection — but the *pattern* was a footgun: the moment a future
  // refactor takes a column name from request input, it's an instant
  // injection. The CASE/COALESCE form below is a single parameterized
  // statement with no string concat. SECURITY_AUDIT.md §H-13.
  const resultJson = result !== undefined ? JSON.stringify(result) : null;
  const errorParam = error !== undefined ? error : null;

  await execute(
    `UPDATE jobs
     SET
       status = $2,
       started_at = CASE WHEN $2 = 'running' THEN now() ELSE started_at END,
       finished_at = CASE
         WHEN $2 IN ('succeeded', 'failed', 'canceled') THEN now()
         ELSE finished_at
       END,
       result = COALESCE($3, result),
       error  = COALESCE($4, error)
     WHERE id = $1`,
    [jobId, status, resultJson, errorParam]
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
