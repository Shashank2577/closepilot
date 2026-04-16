import { cookies } from 'next/headers';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface OAuthState {
  codeVerifier: string;
  redirectUri?: string;
}

// Scopes required for Gmail, Calendar, and Drive
export const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

/**
 * Generate a random string for PKCE code verifier
 */
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (byte) => possible[byte % possible.length]).join('');
}

/**
 * Generate code challenge from code verifier using SHA-256
 */
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Generate OAuth state with PKCE code verifier
 */
export function generateOAuthState(redirectUri?: string): string {
  const codeVerifier = generateRandomString(128);
  const state: OAuthState = {
    codeVerifier,
    redirectUri,
  };

  // Store state in cookie for callback verification
  cookies().set('oauth_state', JSON.stringify(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  // Return a random state parameter for CSRF protection
  return generateRandomString(32);
}

/**
 * Generate Google OAuth authorization URL with PKCE
 */
export async function generateAuthUrl(redirectUri?: string): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured');
  }

  const redirectUriFinal = redirectUri ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/auth/callback`;

  const state = generateOAuthState(redirectUri);
  const codeVerifier = JSON.parse(cookies().get('oauth_state')?.value || '{}').codeVerifier;
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUriFinal,
    response_type: 'code',
    scope: OAUTH_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline', // Allow refresh token
    prompt: 'consent', // Force consent to get refresh token
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  state: string
): Promise<TokenResponse> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/auth/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials are not configured');
  }

  // Verify state
  const stateCookie = cookies().get('oauth_state')?.value;
  if (!stateCookie) {
    throw new Error('Invalid OAuth state: state cookie missing');
  }

  const savedState: OAuthState = JSON.parse(stateCookie);
  const codeVerifier = savedState.codeVerifier;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
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

  // Store tokens securely
  await storeTokens(tokens);

  // Clear state cookie
  cookies().delete('oauth_state');

  return tokens;
}

/**
 * Store tokens in httpOnly cookies
 */
async function storeTokens(tokens: TokenResponse): Promise<void> {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };

  cookies().set('access_token', tokens.access_token, cookieOptions);

  if (tokens.refresh_token) {
    cookies().set('refresh_token', tokens.refresh_token, cookieOptions);
  }

  cookies().set('token_expiry', String(Date.now() + tokens.expires_in * 1000), cookieOptions);
}

/**
 * Get current access token from cookies
 */
export function getAccessToken(): string | undefined {
  return cookies().get('access_token')?.value;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!cookies().get('access_token')?.value;
}

/**
 * Clear all auth cookies
 */
export function clearAuthCookies(): void {
  cookies().delete('access_token');
  cookies().delete('refresh_token');
  cookies().delete('token_expiry');
  cookies().delete('oauth_state');
}

/**
 * Token response from Google OAuth
 */
export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}
