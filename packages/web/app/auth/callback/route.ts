import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '../../../lib/auth/oauth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const storedState = request.cookies.get('oauth_state')?.value;
  const codeVerifier = request.cookies.get('oauth_code_verifier')?.value;

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return NextResponse.json({ error: 'Invalid or missing state/code' }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code, codeVerifier);

    const response = NextResponse.redirect(new URL('/', request.url));

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };

    response.cookies.set('access_token', tokens.access_token, {
      ...cookieOptions,
      maxAge: tokens.expires_in,
    });

    if (tokens.refresh_token) {
      response.cookies.set('refresh_token', tokens.refresh_token, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    // Clear the OAuth state cookies
    response.cookies.delete('oauth_state');
    response.cookies.delete('oauth_code_verifier');

    return response;
  } catch (error) {
    console.error('Failed to exchange token:', error);
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 });
  }
}
