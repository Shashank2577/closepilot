import { cookies } from 'next/headers';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface OAuthState {
  codeVerifier: string;
  redirectUri?: string;
}

export const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (byte) => possible[byte % possible.length]).join('');
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function generateOAuthState(redirectUri?: string): Promise<string> {
  const codeVerifier = generateRandomString(128);
  const state: OAuthState = { codeVerifier, redirectUri };

  const cookieStore = await cookies();
  cookieStore.set('oauth_state', JSON.stringify(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return generateRandomString(32);
}

export async function generateAuthUrl(redirectUri?: string): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured');

  const redirectUriFinal = redirectUri ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/auth/callback`;

  const state = await generateOAuthState(redirectUri);
  const cookieStore = await cookies();
  const codeVerifier = JSON.parse(cookieStore.get('oauth_state')?.value || '{}').codeVerifier;
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUriFinal,
    response_type: 'code',
    scope: OAUTH_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, state: string): Promise<TokenResponse> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/auth/callback`;

  if (!clientId || !clientSecret) throw new Error('Google OAuth credentials are not configured');

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get('oauth_state')?.value;
  if (!stateCookie) throw new Error('Invalid OAuth state: state cookie missing');

  const savedState: OAuthState = JSON.parse(stateCookie);
  const codeVerifier = savedState.codeVerifier;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const tokens: TokenResponse = await response.json();
  await storeTokens(tokens);
  cookieStore.delete('oauth_state');

  return tokens;
}

async function storeTokens(tokens: TokenResponse): Promise<void> {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };

  const cookieStore = await cookies();
  cookieStore.set('access_token', tokens.access_token, cookieOptions);
  if (tokens.refresh_token) {
    cookieStore.set('refresh_token', tokens.refresh_token, cookieOptions);
  }
  cookieStore.set('token_expiry', String(Date.now() + tokens.expires_in * 1000), cookieOptions);
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('access_token')?.value;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  cookieStore.delete('token_expiry');
  cookieStore.delete('oauth_state');
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}
