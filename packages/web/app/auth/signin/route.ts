import { NextResponse } from 'next/server';
import { generatePKCE, generateState, getAuthorizationUrl } from '../../../lib/auth/oauth';

export async function GET() {
  const { verifier, challenge } = generatePKCE();
  const state = generateState();

  const authUrl = getAuthorizationUrl(state, challenge);

  const response = NextResponse.redirect(authUrl);

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 10 * 60, // 10 minutes
  };

  response.cookies.set('oauth_state', state, cookieOptions);
  response.cookies.set('oauth_code_verifier', verifier, cookieOptions);

  return response;
}
