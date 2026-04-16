import { NextRequest, NextResponse } from 'next/server';
import { generateAuthUrl } from '@/lib/auth/oauth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const redirectUri = searchParams.get('redirect') || undefined;

    const authUrl = await generateAuthUrl(redirectUri);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
