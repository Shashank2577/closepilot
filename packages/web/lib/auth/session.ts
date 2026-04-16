import { cookies } from 'next/headers';
import { getAccessToken, clearAuthCookies } from './oauth';

export interface Session {
  accessToken: string;
  tokenExpiry: number;
}

export async function getSession(): Promise<Session | null> {
  const accessToken = await getAccessToken();
  const cookieStore = await cookies();
  const tokenExpiry = cookieStore.get('token_expiry')?.value;

  if (!accessToken || !tokenExpiry) return null;

  return {
    accessToken,
    tokenExpiry: parseInt(tokenExpiry),
  };
}

export async function isSessionValid(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return Date.now() < session.tokenExpiry;
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error('Authentication required');

  if (!(await isSessionValid())) {
    await clearAuthCookies();
    throw new Error('Session expired');
  }

  return session;
}

export async function refreshIfNeeded(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;
  if (await isSessionValid()) return session.accessToken;
  return null;
}
