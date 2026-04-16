import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url));

  // Clear auth cookies
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');

  return response;
}
