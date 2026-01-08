'use client';

import { ReactNode } from 'react';
import { JobProvider } from '@/contexts/JobContext';
import { JobData } from '@/hooks/useJobPolling';

interface DashboardClientProps {
  userId: string;
  initialJobs?: JobData[];
  children: ReactNode;
}

export function DashboardClient({ userId, initialJobs = [], children }: DashboardClientProps) {
  return (
    <JobProvider userId={userId} initialJobs={initialJobs}>
      {children}
    </JobProvider>
  );
}
