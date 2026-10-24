'use client';

import { useEffect } from 'react';

/**
 * While anything holds, automatic sign-out treats the user as active: nobody
 * is signed out in the middle of an upload or a running conversion.
 */
let holds = 0;

export function isIdleHeld(): boolean {
  return holds > 0;
}

export function useIdleHold(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    holds += 1;
    return () => {
      holds -= 1;
    };
  }, [active]);
}
