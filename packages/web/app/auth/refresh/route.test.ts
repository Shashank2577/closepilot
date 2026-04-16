import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const mockRefreshAccessToken = vi.fn();

vi.mock('../../../lib/auth/oauth', () => ({
  refreshAccessToken: (...args: any[]) => mockRefreshAccessToken(...args),
}));

describe('Refresh Route', () => {
  it('should return 400 if no refresh token is available', async () => {
    const req = new NextRequest('http://localhost:3000/auth/refresh', { method: 'POST' });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it('should successfully refresh tokens', async () => {
    const req = new NextRequest('http://localhost:3000/auth/refresh', { method: 'POST' });
    req.cookies.set('refresh_token', 'old-refresh-token');

    mockRefreshAccessToken.mockResolvedValueOnce({
      access_token: 'new-access-token',
      expires_in: 3600,
      refresh_token: 'new-refresh-token', // sometimes returned
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const cookies = response.cookies.getAll();
    expect(cookies.some(c => c.name === 'access_token' && c.value === 'new-access-token')).toBe(true);
    expect(cookies.some(c => c.name === 'refresh_token' && c.value === 'new-refresh-token')).toBe(true);
  });

  it('should return 500 if token refresh fails', async () => {
    const req = new NextRequest('http://localhost:3000/auth/refresh', { method: 'POST' });
    req.cookies.set('refresh_token', 'bad-refresh-token');

    mockRefreshAccessToken.mockRejectedValueOnce(new Error('Failed'));

    const response = await POST(req);
    expect(response.status).toBe(500);
  });
});
