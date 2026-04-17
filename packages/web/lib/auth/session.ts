import { cookies } from 'next/headers';
import { getAccessToken, clearAuthCookies } from './oauth';

export interface Session {
  accessToken: string;
  tokenExpiry: number;
}

/**
 * Get current session information
 */
export async function getSession(): Promise<Session | null> {
  const accessToken = await getAccessToken();
  const tokenExpiry = (await cookies()).get('token_expiry')?.value;

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
export async function isSessionValid(): Promise<boolean> {
  const session = await getSession();
  if (!session) {
    return false;
  }

  return Date.now() < session.tokenExpiry;
}

/**
 * Require authentication - throw error if not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    throw new Error('Authentication required');
  }

  if (!isSessionValid()) {
    await clearAuthCookies();
    throw new Error('Session expired');
  }

  return session;
}

/**
 * Refresh token if needed (for server-side use)
 */
export async function refreshIfNeeded(): Promise<string | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  // Token is still valid
  if (await isSessionValid()) {
    return session.accessToken;
  }

  // Token is expired, need to refresh
  // This would be called from API routes
  return null;
}
