import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth/oauth';

interface GoogleUserInfo {
  email: string;
  name: string;
  picture: string;
}

/**
 * Get current user information from Google
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch user info from Google
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch user info' },
        { status: response.status }
      );
    }

    const userInfo = await response.json() as GoogleUserInfo;

    return NextResponse.json({
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
