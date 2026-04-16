import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '../../../lib/auth/oauth';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token available' }, { status: 400 });
  }

  try {
    const tokens = await refreshAccessToken(refreshToken);

    const response = NextResponse.json({ success: true });

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

    return response;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
  }
}
