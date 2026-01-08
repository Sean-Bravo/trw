# Frontend Tests

This directory contains unit and integration tests for the TaxFormatter dashboard components.

## Test Structure

```
__tests__/
├── components/          # Component tests
│   ├── DiffViewer.test.tsx
│   ├── FileUploader.test.tsx
│   └── JobHistoryTable.test.tsx
├── contexts/            # Context provider tests
│   └── JobContext.test.tsx
├── factories/           # Test data factories
│   ├── index.ts         # User, session, transaction factories
│   └── jobs.ts          # Job data factories
├── hooks/               # Custom hook tests
│   └── useJobPolling.test.ts
├── utils/               # Test utilities
│   └── test-utils.tsx   # Custom render, helpers
└── README.md
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPatterns="useJobPolling"

# Run component tests only
npm test -- --testPathPatterns="components"
```

## Test Utilities

### Custom Render

The `test-utils.tsx` file provides a custom render function that wraps components with necessary providers:

```tsx
import { render, screen } from '../utils/test-utils';

// Renders with JobProvider (default userId: 'test-user')
render(<MyComponent />);

// Renders with custom initial jobs
render(<MyComponent />, {
  initialJobs: [createSucceededJob()],
});
```

### Job Factories

Create mock job data for tests:

```tsx
import {
  createMockJobData,
  createQueuedJob,
  createRunningJob,
  createSucceededJob,
  createFailedJob,
  createMockJobs,
} from '../factories/jobs';

// Create a queued job with default values
const job = createQueuedJob();

// Create with custom values
const customJob = createSucceededJob({
  jobId: 'my-job-123',
  filename: 'transactions.csv',
});

// Create multiple jobs
const jobs = createMockJobs(5);
```

### Helper Functions

```tsx
import {
  createMockFile,
  mockFetch,
  mockFetchError,
  waitForLoadingToFinish,
} from '../utils/test-utils';

// Create a mock file for upload tests
const file = createMockFile('data.csv', 1024, 'text/csv');

// Mock fetch responses
mockFetch({ success: true });
mockFetchError(new Error('Network error'));

// Wait for async updates
await waitForLoadingToFinish();
```

## Test Coverage

### useJobPolling Hook (12 tests)

| Test | Description |
|------|-------------|
| no poll when null | Should not poll when jobId is null |
| no poll when disabled | Should not poll when enabled is false |
| fetch on jobId | Should fetch job data when jobId is provided |
| continue polling queued | Should continue polling for queued jobs |
| continue polling running | Should continue polling for running jobs |
| stop on success | Should stop polling when job succeeds |
| stop on failure | Should stop polling when job fails |
| onSuccess callback | Should call onSuccess callback when job is fetched |
| onError callback | Should call onError callback when fetch fails |
| network errors | Should handle network errors |
| cleanup on unmount | Should clean up on unmount |
| jobId change | Should restart polling when jobId changes |

### JobContext Provider (10 tests)

| Test | Description |
|------|-------------|
| throw outside provider | Should throw error when used outside provider |
| default values | Should provide default values |
| initialJobs | Should use initialJobs when provided |
| setActiveJob | Should set active job when called |
| clearActiveJob | Should clear active job when called |
| refreshJobHistory | Should refresh job history from API |
| refresh failure | Should handle refresh failure gracefully |
| polling updates | Should update job history when polling returns |
| isPolling state | Should expose isPolling state from hook |
| mount fetch | Should fetch jobs on mount when initialJobs is empty |

### FileUploader Component (11 tests)

| Test | Description |
|------|-------------|
| render dropzone | Should render dropzone with correct text |
| accept CSV | Should accept dropped CSV file |
| invalid file error | Should show error for invalid file |
| upload button | Should show upload button after file is selected |
| remove file | Should allow removing selected file |
| call upload | Should call uploadCSVFile when upload button is clicked |
| success message | Should show success message after successful upload |
| rate limit error | Should show error message for rate limit |
| file too large | Should show error message for file too large |
| progress | Should show progress during upload |
| disable button | Should disable upload button while uploading |

### DiffViewer Component (11 tests)

| Test | Description |
|------|-------------|
| empty state | Should render empty state when no job is active |
| queued state | Should show processing state when job is queued |
| running state | Should show processing state when job is running |
| success state | Should show diff data when job succeeds |
| legend | Should show legend for diff colors |
| collapsible | Should be collapsible |
| show more | Should show "Show more" button when > 5 rows |
| toggle rows | Should toggle showing all rows |
| empty result | Should handle empty result gracefully |
| missing columns | Should handle missing columns gracefully |
| empty cells | Should show empty cells as "empty" italic text |

### JobHistoryTable Component (18 tests)

| Test | Description |
|------|-------------|
| empty state | Should render empty state when no jobs |
| job list | Should render job list when jobs exist |
| queued status | Should show correct status for queued jobs |
| running status | Should show correct status for running jobs |
| succeeded status | Should show correct status for succeeded jobs |
| failed status | Should show correct status for failed jobs |
| view button | Should show View button for completed jobs |
| download button | Should show Download button for completed jobs |
| retry button | Should show Retry button for failed jobs |
| no buttons queued | Should not show action buttons for queued jobs |
| no buttons running | Should not show action buttons for running jobs |
| transaction count | Should show transaction count for completed jobs |
| formatted date | Should display formatted date |
| select job | Should allow selecting a job by clicking row |
| highlight active | Should highlight active job |
| job order | Should render multiple jobs in correct order |
| stop propagation | Should stop event propagation when clicking buttons |

## Mocking Patterns

### Mocking Hooks

```tsx
jest.mock('@/hooks/useJobPolling', () => ({
  useJobPolling: jest.fn(() => ({
    job: null,
    isPolling: false,
    error: null,
  })),
}));
```

### Mocking Fetch

```tsx
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ jobs: [] }),
  })
) as jest.Mock;
```

### Mocking Next.js

```tsx
// Already configured in jest.setup.js
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  usePathname: jest.fn(() => '/'),
}));

jest.mock('next/link', () => {
  return ({ children, href }) => <a href={href}>{children}</a>;
});
```

## Writing New Tests

1. Create test file in appropriate directory
2. Import from `../utils/test-utils` instead of `@testing-library/react`
3. Use factories for test data
4. Mock external dependencies (fetch, hooks, etc.)
5. Use `waitFor` for async assertions
6. Clean up mocks in `beforeEach`

Example:

```tsx
import { render, screen, waitFor } from '../utils/test-utils';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '@/components/MyComponent';
import { createSucceededJob } from '../factories/jobs';

describe('MyComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<MyComponent />, {
      initialJobs: [createSucceededJob()],
    });

    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```
