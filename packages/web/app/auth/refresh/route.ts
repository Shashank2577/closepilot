import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token available' }, { status: 401 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials are not configured');
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const tokens = await response.json();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    };

    cookieStore.set('access_token', tokens.access_token, cookieOptions);
    cookieStore.set('token_expiry', String(Date.now() + tokens.expires_in * 1000), cookieOptions);
    if (tokens.refresh_token) {
      cookieStore.set('refresh_token', tokens.refresh_token, cookieOptions);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 401 });
  }
}
