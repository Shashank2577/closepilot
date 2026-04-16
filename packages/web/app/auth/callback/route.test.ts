import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const mockExchangeCodeForTokens = vi.fn();

vi.mock('../../../lib/auth/oauth', () => ({
  exchangeCodeForTokens: (...args: any[]) => mockExchangeCodeForTokens(...args),
}));

describe('Callback Route', () => {
  it('should return 400 if missing code or state', async () => {
    const req = new NextRequest('http://localhost:3000/auth/callback');
    const response = await GET(req);
    expect(response.status).toBe(400);
  });

  it('should return 400 if state does not match', async () => {
    const req = new NextRequest('http://localhost:3000/auth/callback?code=mock-code&state=mock-state');
    req.cookies.set('oauth_state', 'different-state');
    req.cookies.set('oauth_code_verifier', 'mock-verifier');

    const response = await GET(req);
    expect(response.status).toBe(400);
  });

  it('should exchange code and set access and refresh tokens', async () => {
    const req = new NextRequest('http://localhost:3000/auth/callback?code=mock-code&state=mock-state');
    req.cookies.set('oauth_state', 'mock-state');
    req.cookies.set('oauth_code_verifier', 'mock-verifier');

    mockExchangeCodeForTokens.mockResolvedValueOnce({
      access_token: 'new-access-token',
      expires_in: 3600,
      refresh_token: 'new-refresh-token',
    });

    const response = await GET(req);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get('location')).toBe('http://localhost:3000/');

    const cookies = response.cookies.getAll();
    expect(cookies.some(c => c.name === 'access_token' && c.value === 'new-access-token')).toBe(true);
    expect(cookies.some(c => c.name === 'refresh_token' && c.value === 'new-refresh-token')).toBe(true);

    // Check that oauth state cookies are deleted
    expect(cookies.some(c => c.name === 'oauth_state' && c.value === '')).toBe(true);
    expect(cookies.some(c => c.name === 'oauth_code_verifier' && c.value === '')).toBe(true);
  });

  it('should return 500 if token exchange fails', async () => {
    const req = new NextRequest('http://localhost:3000/auth/callback?code=mock-code&state=mock-state');
    req.cookies.set('oauth_state', 'mock-state');
    req.cookies.set('oauth_code_verifier', 'mock-verifier');

    mockExchangeCodeForTokens.mockRejectedValueOnce(new Error('Failed'));

    const response = await GET(req);
    expect(response.status).toBe(500);
  });
});
