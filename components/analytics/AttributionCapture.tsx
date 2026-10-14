'use client';

import { useEffect } from 'react';
import { captureAttribution } from '@/lib/attribution';

/** Records first-touch acquisition attribution (lib/attribution.ts). Renders nothing. */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
