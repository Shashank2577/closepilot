import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';

// Mock the oauth library
vi.mock('../../../lib/auth/oauth', () => ({
  generatePKCE: vi.fn(() => ({ verifier: 'mock-verifier', challenge: 'mock-challenge' })),
  generateState: vi.fn(() => 'mock-state'),
  getAuthorizationUrl: vi.fn(() => 'http://mock-auth-url'),
}));

describe('SignIn Route', () => {
  it('should redirect to Google auth url and set cookies', async () => {
    const response = await GET({} as any);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://mock-auth-url/');

    const setCookieHeader = response.headers.get('set-cookie') || '';
    expect(setCookieHeader).toContain('oauth_state=mock-state');
    expect(setCookieHeader).toContain('oauth_code_verifier=mock-verifier');
    expect(setCookieHeader).toContain('HttpOnly');
    expect(setCookieHeader).toContain('SameSite=lax');
  });
});
