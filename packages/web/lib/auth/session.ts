import { cookies } from 'next/headers';
import { getAccessToken, clearAuthCookies } from './oauth';

export interface Session {
  accessToken: string;
  tokenExpiry: number;
}

/**
 * Get current session information
 */
export function getSession(): Session | null {
  const accessToken = getAccessToken();
  const tokenExpiry = cookies().get('token_expiry')?.value;

  if (!accessToken || !tokenExpiry) {
    return null;
  }

  return {
    accessToken,
    tokenExpiry: parseInt(tokenExpiry),
  };
}

/**
 * Check if session is valid (not expired)
 */
export function isSessionValid(): boolean {
  const session = getSession();
  if (!session) {
    return false;
  }

  return Date.now() < session.tokenExpiry;
}

/**
 * Require authentication - throw error if not authenticated
 */
export function requireAuth(): Session {
  const session = getSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  if (!isSessionValid()) {
    clearAuthCookies();
    throw new Error('Session expired');
  }

  return session;
}

/**
 * Refresh token if needed (for server-side use)
 */
export async function refreshIfNeeded(): Promise<string | null> {
  const session = getSession();

  if (!session) {
    return null;
  }

  // Token is still valid
  if (isSessionValid()) {
    return session.accessToken;
  }

  // Token is expired, need to refresh
  // This would be called from API routes
  return null;
}
