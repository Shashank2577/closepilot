import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

describe('Middleware', () => {
  it('should allow public routes to bypass checks', () => {
    const publicRoutes = ['/', '/auth/signin', '/auth/callback'];

    publicRoutes.forEach(route => {
      const req = new NextRequest(`http://localhost:3000${route}`);
      const res = middleware(req);

      // NextResponse.next() returns a response without a location header
      expect(res.headers.get('location')).toBeNull();
    });
  });

  it('should redirect to /auth/signin if accessing protected route without token', () => {
    const req = new NextRequest('http://localhost:3000/dashboard');
    const res = middleware(req);

    // Check if it redirects
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/auth/signin');
  });

  it('should allow protected route if access_token is present', () => {
    const req = new NextRequest('http://localhost:3000/dashboard');
    req.cookies.set('access_token', 'valid-token');

    const res = middleware(req);

    // Check if it passes through
    expect(res.headers.get('location')).toBeNull();
  });
});
