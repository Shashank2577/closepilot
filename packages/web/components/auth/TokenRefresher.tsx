'use client';

import { useEffect } from 'react';

// Refresh 1 minute before 10-minute expiry (i.e. every 9 minutes)
const REFRESH_INTERVAL = 9 * 60 * 1000;

export function TokenRefresher() {
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await fetch('/auth/refresh', { method: 'POST' });
      } catch (error) {
        console.error('Auto token refresh failed:', error);
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  return null;
}
