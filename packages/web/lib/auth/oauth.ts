import crypto from 'crypto';

export const OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
    : 'http://localhost:3002/auth/callback',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ],
};

export function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

export function getAuthorizationUrl(state: string, challenge: string) {
  const url = new URL(OAUTH_CONFIG.authUrl);
  url.searchParams.append('client_id', OAUTH_CONFIG.clientId);
  url.searchParams.append('redirect_uri', OAUTH_CONFIG.redirectUri);
  url.searchParams.append('response_type', 'code');
  url.searchParams.append('scope', OAUTH_CONFIG.scopes.join(' '));
  url.searchParams.append('state', state);
  url.searchParams.append('code_challenge', challenge);
  url.searchParams.append('code_challenge_method', 'S256');
  url.searchParams.append('access_type', 'offline');
  url.searchParams.append('prompt', 'consent'); // to ensure refresh token is returned
  return url.toString();
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(code: string, verifier: string): Promise<TokenResponse> {
  const params = new URLSearchParams();
  params.append('client_id', OAUTH_CONFIG.clientId);
  params.append('client_secret', OAUTH_CONFIG.clientSecret);
  params.append('code', code);
  params.append('code_verifier', verifier);
  params.append('redirect_uri', OAUTH_CONFIG.redirectUri);
  params.append('grant_type', 'authorization_code');

  const response = await fetch(OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange token: ${errorText}`);
  }

  return response.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const params = new URLSearchParams();
  params.append('client_id', OAUTH_CONFIG.clientId);
  params.append('client_secret', OAUTH_CONFIG.clientSecret);
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');

  const response = await fetch(OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  return response.json() as Promise<TokenResponse>;
}
