import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth/oauth';

export async function POST(request: NextRequest) {
  try {
    await clearAuthCookies();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Also support GET for simplicity
  return POST(request);
}
