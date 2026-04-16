import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('Logout Route', () => {
  it('should redirect to home and clear cookies', async () => {
    const req = new NextRequest('http://localhost:3000/auth/logout', { method: 'POST' });
    req.cookies.set('access_token', 'token');
    req.cookies.set('refresh_token', 'token');

    const response = await POST(req);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/');

    const cookies = response.cookies.getAll();
    expect(cookies.some(c => c.name === 'access_token' && c.value === '')).toBe(true);
    expect(cookies.some(c => c.name === 'refresh_token' && c.value === '')).toBe(true);
  });
});
