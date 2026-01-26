# Plan: Unified Processing History with Tabs

**Date:** January 27, 2026
**Feature:** Combine crypto and bank job history into single tabbed interface

---

## Overview

Currently, Processing History only shows crypto jobs. Bank statement jobs are processed but not tracked in the UI. This plan adds tabbed filtering to show both job types.

---

## Tasks

### 1. Database: Add Bank Jobs Table
**File:** `lib/db.ts` or new migration

- Create `bank_jobs` table (or add `job_type` column to existing `jobs` table)
- Fields needed:
  - `id` (uuid)
  - `user_id` (uuid, FK)
  - `filename` (string)
  - `status` (queued/processing/completed/failed)
  - `detected_bank` (string)
  - `transaction_count` (int)
  - `output_format` (qbo/xero/excel)
  - `created_at` (timestamp)
  - `completed_at` (timestamp)
  - `result_key` (S3 path)

### 2. Backend: Save Bank Jobs to Database
**File:** `app/api/bank/process/route.ts`

- After successful Lambda processing, save job record to database
- Include metadata: bank name, transaction count, output format

### 3. Backend: Bank Jobs API Endpoints
**Files:** New API routes

- `GET /api/bank/jobs` - List user's bank jobs
- `GET /api/bank/jobs/[jobId]` - Get single bank job details
- `DELETE /api/bank/jobs/[jobId]` - Delete bank job

### 4. Frontend: Unified Job Type
**File:** `types/job.ts` or similar

```typescript
type JobType = 'crypto' | 'bank';

interface UnifiedJob {
  id: string;
  type: JobType;
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  // Crypto-specific
  exchange?: string;
  // Bank-specific
  detectedBank?: string;
  transactionCount?: number;
  outputFormat?: string;
}
```

### 5. Frontend: Add Tabs to JobHistoryTable
**File:** `components/dashboard/JobHistoryTable.tsx`

- Add tab bar: "All" | "Crypto" | "Bank"
- Filter jobs based on selected tab
- Add type indicator icon/badge to each row

```tsx
const [activeTab, setActiveTab] = useState<'all' | 'crypto' | 'bank'>('all');

const filteredJobs = jobs.filter(job => {
  if (activeTab === 'all') return true;
  return job.type === activeTab;
});
```

### 6. Frontend: Update JobContext
**File:** `contexts/JobContext.tsx`

- Fetch both crypto and bank jobs
- Merge into single sorted list
- Handle polling for both types

### 7. Frontend: Type-Specific Actions
**File:** `components/dashboard/JobHistoryTable.tsx`

- View button routes to correct detail page
- Download button uses correct API endpoint
- Delete button calls correct API

---

## UI Design

```
┌─────────────────────────────────────────────────────────────┐
│ Processing History                                          │
│ Track uploads and download results                          │
├─────────────────────────────────────────────────────────────┤
│  [All]  [📊 Crypto]  [🏦 Bank]                              │
├─────────────────────────────────────────────────────────────┤
│ 📊 coinbase_clean_3.csv    Completed  1/26  View  Download  │
│ 🏦 chase_statement.pdf     Completed  1/26  View  Download  │
│ 📊 coinbase_clean_1.csv    Completed  1/17  View  Download  │
└─────────────────────────────────────────────────────────────┘
```

---

## Files to Modify/Create

| File | Action | Description |
|------|--------|-------------|
| `lib/db.ts` | Modify | Add bank_jobs queries |
| `app/api/bank/jobs/route.ts` | Create | List bank jobs |
| `app/api/bank/jobs/[jobId]/route.ts` | Create | Get/delete bank job |
| `app/api/bank/process/route.ts` | Modify | Save job to DB after processing |
| `contexts/JobContext.tsx` | Modify | Fetch and merge both job types |
| `components/dashboard/JobHistoryTable.tsx` | Modify | Add tabs and type indicators |
| `types/job.ts` | Create/Modify | Unified job type definition |

---

## Migration Strategy

1. Add database table first
2. Update bank process API to save jobs
3. Create bank jobs API endpoints
4. Update frontend to fetch both
5. Add tabs UI last

---

## Estimated Scope

- Database: ~30 min
- Backend APIs: ~1 hour
- Frontend context: ~30 min
- Frontend UI: ~1 hour
- Testing: ~30 min

**Total: ~3.5 hours**

---

## Notes

- Bank jobs don't need real-time polling (they complete quickly)
- Consider: should bank job history persist across sessions? (Yes - save to DB)
- Future: Could add more tabs for other file types
