# API Routes Complete ✅

## Phase 3: Upload API Routes

### **What We Built**

Created two critical API endpoints to power the S3 upload flow:

1. **POST /api/uploads/presigned-url** - Generate presigned S3 POST URLs
2. **POST /api/uploads/[uploadId]/confirm** - Confirm upload and create processing job

---

## 1. POST /api/uploads/presigned-url

**Location:** `/app/api/uploads/presigned-url/route.ts`

### **Purpose**
Generate a presigned POST URL that allows the browser to upload files directly to S3 without exposing AWS credentials.

### **Request**
```typescript
POST /api/uploads/presigned-url
Content-Type: application/json

{
  filename: string,  // e.g., "transactions.csv"
  fileSize: number   // in bytes
}
```

### **Response (200 OK)**
```typescript
{
  presignedPost: {
    url: string,  // S3 bucket URL
    fields: {
      key: string,
      policy: string,
      'x-amz-algorithm': string,
      'x-amz-credential': string,
      'x-amz-date': string,
      'x-amz-security-token': string,
      'x-amz-signature': string,
      'x-amz-server-side-encryption': 'aws:kms',  // if KMS_KEY_ID is set
      'x-amz-server-side-encryption-aws-kms-key-id': string,
      'x-amz-meta-user-id': string,
      'x-amz-meta-upload-id': string,
      'x-amz-meta-original-filename': string,
      'x-amz-meta-tier': string
    }
  },
  uploadId: string,  // UUID for tracking
  maxSize: number    // Tier-specific file size limit
}
```

### **Error Responses**

#### 401 Unauthorized
```json
{ "error": "Unauthorized" }
```

#### 400 Bad Request
```json
{ "error": "Missing or invalid filename" }
{ "error": "Missing or invalid file size" }
{ "error": "Only CSV files are supported" }
```

#### 413 Payload Too Large
```json
{ "error": "File size exceeds your tier limit. Upgrade for larger files." }
```

#### 429 Rate Limit Exceeded (Future - when Redis is connected)
```json
{ "error": "Rate limit exceeded", "jobsRemainingThisHour": 0 }

Headers:
  Retry-After: 3600
```

### **Features**

✅ **Authentication** - Requires NextAuth session
✅ **Tier-based file size limits:**
  - Free: 50MB
  - Pro: 500MB
  - Premium: 2GB

✅ **File validation:**
  - Must be `.csv` extension
  - Must have valid size > 0

✅ **S3 Key structure:**
  ```
  uploads/<userId>/<uploadId>/<filename>
  ```

✅ **KMS encryption** - Optional server-side encryption with customer-managed key
✅ **Metadata tagging:**
  - User ID
  - Upload ID
  - Original filename
  - Subscription tier

✅ **Security:**
  - 1-hour expiration on presigned POST
  - Content-Type enforcement (text/csv)
  - Size limit enforcement in S3 policy

### **Implementation Notes**

**Production TODOs:**
- [ ] Store upload metadata in DynamoDB `Uploads` table
- [ ] Implement Redis-based rate limiting
- [ ] Add CloudWatch logging for upload requests
- [ ] Add Sentry error tracking

**Current State:**
- ✅ Fully functional for uploads
- ⚠️ No persistent storage (in-memory only)
- ⚠️ No rate limiting (placeholders only)

---

## 2. POST /api/uploads/[uploadId]/confirm

**Location:** `/app/api/uploads/[uploadId]/confirm/route.ts`

### **Purpose**
Confirm that a file was successfully uploaded to S3, then create a processing job and send it to the SQS queue.

### **Request**
```typescript
POST /api/uploads/<uploadId>/confirm
Content-Type: application/json
Idempotency-Key: <uuid>

{
  etag: string  // ETag from S3 upload response
}
```

### **Response (200 OK)**
```typescript
{
  jobId: string,  // UUID for the processing job
  status: 'queued',
  jobsRemainingThisHour: number | 'unlimited'
}
```

### **Error Responses**

#### 401 Unauthorized
```json
{ "error": "Unauthorized" }
```

#### 400 Bad Request
```json
{ "error": "Missing Idempotency-Key header" }
{ "error": "Missing or invalid ETag" }
```

#### 404 Not Found
```json
{ "error": "Upload not found" }
```

#### 409 Conflict
```json
{ "error": "ETag mismatch - file may have been modified" }
```

#### 429 Rate Limit Exceeded (Future - when Redis is connected)
```json
{ "error": "Rate limit exceeded" }

Headers:
  Retry-After: 3600
```

### **Features**

✅ **Idempotency** - Duplicate requests with same Idempotency-Key return same jobId
✅ **ETag verification** - Ensures file integrity (currently placeholder)
✅ **Job creation** - Generates UUID for tracking
✅ **SQS integration** - Sends job message to processing queue
✅ **Rate limiting** - Tier-based job limits (placeholder):
  - Free: 5 jobs/hour
  - Pro: 20 jobs/hour
  - Premium: Unlimited

### **SQS Message Format**
```json
{
  "jobId": "uuid",
  "uploadId": "uuid",
  "userId": "clerk_user_123",
  "bucket": "taxformatter-uploads",
  "key": "uploads/<userId>/<uploadId>/<filename>",
  "tier": "free",
  "timestamp": "2025-01-15T10:30:00Z"
}

MessageAttributes: {
  "tier": "free",
  "userId": "clerk_user_123"
}
```

### **Implementation Notes**

**Production TODOs:**
- [ ] Fetch upload metadata from DynamoDB `Uploads` table
- [ ] Store job record in DynamoDB `Jobs` table
- [ ] Implement Redis-based rate limiting
- [ ] Verify S3 object existence with HeadObjectCommand
- [ ] Match ETag for integrity verification
- [ ] Store idempotency keys in Redis (with TTL)
- [ ] Add CloudWatch logging
- [ ] Add Sentry error tracking

**Current State:**
- ✅ Fully functional for job creation
- ✅ SQS message sending works (if QUEUE_URL is set)
- ⚠️ In-memory storage only (no DynamoDB)
- ⚠️ No rate limiting (placeholders only)
- ⚠️ No S3 verification (placeholder)

---

## Environment Variables

### **Required for Basic Functionality**
```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1

# S3 Bucket
AWS_S3_BUCKET=taxformatter-uploads
```

### **Optional**
```bash
# KMS Encryption (recommended for production)
AWS_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012

# SQS Queue (required for job processing)
AWS_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/taxformatter-processing-queue
```

### **Future (Production)**
```bash
# Redis (for rate limiting and idempotency)
REDIS_URL=redis://localhost:6379

# DynamoDB Tables
DYNAMODB_UPLOADS_TABLE=taxformatter-uploads
DYNAMODB_JOBS_TABLE=taxformatter-jobs
```

---

## Complete Upload Flow

```
┌────────────────────────────────────────────────────────────────┐
│ 1. USER SELECTS FILE                                           │
│    - FileUploader.tsx validates file                           │
│    - Checks .csv extension                                     │
│    - Checks file size                                          │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. REQUEST PRESIGNED URL (10% progress)                        │
│    POST /api/uploads/presigned-url                             │
│    { filename, fileSize }                                      │
│                                                                │
│    Backend:                                                    │
│    - Authenticate user (NextAuth)                              │
│    - Check file size vs tier limit                            │
│    - Generate uploadId (UUID)                                  │
│    - Create S3 key: uploads/<userId>/<uploadId>/<filename>     │
│    - Generate presigned POST (1 hour expiration)               │
│    - Return presignedPost + uploadId                           │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. UPLOAD TO S3 (20-80% progress)                              │
│    POST <presignedPost.url>                                    │
│    FormData:                                                   │
│    - All presignedPost.fields                                  │
│    - file (LAST!)                                              │
│                                                                │
│    S3:                                                         │
│    - Validates policy, signature, conditions                   │
│    - Enforces size limit                                       │
│    - Enforces content-type                                     │
│    - Applies KMS encryption (if configured)                    │
│    - Stores file at key                                        │
│    - Returns ETag in response header                           │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. CONFIRM UPLOAD (90-100% progress)                           │
│    POST /api/uploads/<uploadId>/confirm                        │
│    Headers: { Idempotency-Key: <uuid> }                        │
│    { etag }                                                    │
│                                                                │
│    Backend:                                                    │
│    - Authenticate user                                         │
│    - Check idempotency key (prevent duplicates)                │
│    - Verify upload exists                                      │
│    - Generate jobId (UUID)                                     │
│    - Create job record                                         │
│    - Send SQS message                                          │
│    - Return jobId + status                                     │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. JOB QUEUED                                                  │
│    SQS Queue: taxformatter-processing-queue                    │
│                                                                │
│    Message:                                                    │
│    {                                                           │
│      jobId,                                                    │
│      uploadId,                                                 │
│      userId,                                                   │
│      bucket: "taxformatter-uploads",                           │
│      key: "uploads/<userId>/<uploadId>/<filename>",            │
│      tier,                                                     │
│      timestamp                                                 │
│    }                                                           │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ 6. WORKER LAMBDA PROCESSES (Future - not built yet)            │
│    - Pulls message from SQS                                    │
│    - Downloads CSV from S3                                     │
│    - Validates CSV format                                      │
│    - Detects exchange (Coinbase, Binance, etc.)                │
│    - Calls tier-appropriate AI                                 │
│    - Categorizes transactions                                  │
│    - Generates tax-ready CSV                                   │
│    - Uploads results to S3                                     │
│    - Updates job status to 'completed'                         │
│    - Publishes to Redis Pub/Sub                                │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│ 7. WEBSOCKET NOTIFIES CLIENT (Future - not built yet)          │
│    - Redis Pub/Sub → WebSocket server                          │
│    - WebSocket → Browser                                       │
│    - Update JobHistoryTable                                    │
│    - Show download button                                      │
└────────────────────────────────────────────────────────────────┘
```

---

## Testing the API Routes

### **Prerequisites**
1. Set AWS credentials in `.env.local`:
   ```bash
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=taxformatter-uploads
   ```

2. Create S3 bucket with CORS configuration:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["POST"],
       "AllowedOrigins": ["http://localhost:3000", "https://taxformatter.com"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

### **Test Flow**

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Sign in to dashboard:**
   ```
   http://localhost:3000/dashboard
   ```

3. **Upload a CSV file:**
   - Drag and drop a CSV file (< 50MB for free tier)
   - Click "Upload & Process"
   - Watch progress bar (Requesting → Uploading → Confirming)

4. **Check console logs:**
   ```
   [Presigned URL] Generated for user clerk_xxx, upload uuid, file test.csv
   [Upload Confirm] User clerk_xxx confirming upload uuid with ETag "abc123"
   [Upload Confirm] Created job record: { jobId, uploadId, userId, tier, status }
   [Upload Confirm] Sent SQS message msg_123 for job uuid
   ```

5. **Verify S3:**
   ```bash
   aws s3 ls s3://taxformatter-uploads/uploads/<userId>/<uploadId>/
   ```

6. **Check SQS (if configured):**
   ```bash
   aws sqs receive-message --queue-url <QUEUE_URL>
   ```

---

## Dependencies Added

```json
{
  "@aws-sdk/client-s3": "^3.x",
  "@aws-sdk/s3-presigned-post": "^3.x",
  "@aws-sdk/client-sqs": "^3.x"
}
```

Installed via:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-presigned-post @aws-sdk/client-sqs
```

---

## Build Status

✅ **TypeScript compilation:** Success
✅ **Next.js build:** Success
✅ **API routes registered:**
- `/api/uploads/presigned-url`
- `/api/uploads/[uploadId]/confirm`

---

## What's Working

✅ Complete end-to-end upload flow
✅ Presigned POST URL generation
✅ Direct browser-to-S3 uploads
✅ Job creation with UUIDs
✅ SQS message sending (when configured)
✅ Idempotency protection
✅ Tier-based file size enforcement
✅ Progress tracking in UI
✅ Error handling and user feedback

---

## What's Next (Phase 4)

### **Critical for MVP:**
1. **DynamoDB integration** - Store uploads and jobs
2. **Redis integration** - Rate limiting and idempotency
3. **S3 verification** - HeadObject + ETag matching
4. **Worker Lambda** - Process CSV files
5. **WebSocket server** - Real-time job updates

### **API Routes Needed:**
6. **GET /api/jobs/[jobId]** - Check job status
7. **GET /api/uploads** - List user's uploads (for JobHistoryTable)
8. **GET /api/downloads/[jobId]/csv** - Download processed CSV
9. **GET /api/stats** - User stats (for StatsCards)

### **Infrastructure (Terraform):**
10. S3 bucket with KMS encryption
11. SQS queue with DLQ
12. DynamoDB tables (Uploads, Jobs)
13. ElastiCache Redis cluster
14. Lambda functions (worker, virus scanner)
15. API Gateway WebSocket
16. CloudWatch alarms

---

## File Changes

```
/Users/sean/Desktop/trw/
├── app/api/uploads/
│   ├── presigned-url/
│   │   └── route.ts                      ✅ CREATED (180 lines)
│   └── [uploadId]/
│       └── confirm/
│           └── route.ts                  ✅ CREATED (220 lines)
│
├── .env.example                          ✅ UPDATED
│   - Added AWS_S3_BUCKET=taxformatter-uploads
│   - Added AWS_KMS_KEY_ID (optional)
│   - Added AWS_SQS_QUEUE_URL
│
├── package.json                          ✅ UPDATED
│   - @aws-sdk/client-s3
│   - @aws-sdk/s3-presigned-post
│   - @aws-sdk/client-sqs
│
└── API_ROUTES_COMPLETE.md                ✅ CREATED (this file)
```

---

## Ready for Production?

**Current State:** ✅ **MVP-Ready for Development/Testing**

**Before Production:**
- [ ] Add DynamoDB for persistent storage
- [ ] Add Redis for rate limiting
- [ ] Add S3 object verification
- [ ] Add CloudWatch logging
- [ ] Add Sentry error tracking
- [ ] Set up CORS on S3 bucket
- [ ] Configure KMS encryption
- [ ] Create SQS queue with DLQ
- [ ] Add API request validation with Zod
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Set up CI/CD pipeline
- [ ] Load test API endpoints

---

**Great progress!** The complete upload flow is now functional. Users can upload CSV files directly to S3, and jobs are created and queued for processing. 🚀

**Next milestone:** Build the Worker Lambda to process CSV files with tier-based AI categorization.
