import { describe, it, expect, vi } from 'vitest';
import { generatePKCE, generateState, getAuthorizationUrl, exchangeCodeForTokens } from './oauth';

describe('OAuth Library', () => {
  it('should generate PKCE challenge and verifier', () => {
    const { verifier, challenge } = generatePKCE();
    expect(verifier).toBeDefined();
    expect(typeof verifier).toBe('string');
    expect(verifier.length).toBeGreaterThan(0);

    expect(challenge).toBeDefined();
    expect(typeof challenge).toBe('string');
    expect(challenge.length).toBeGreaterThan(0);
  });

  it('should generate random state', () => {
    const state1 = generateState();
    const state2 = generateState();
    expect(state1).not.toBe(state2);
    expect(state1.length).toBe(32); // 16 bytes in hex is 32 chars
  });

  it('should get authorization url', () => {
    const state = 'test-state';
    const challenge = 'test-challenge';
    const url = getAuthorizationUrl(state, challenge);

    expect(url).toContain('response_type=code');
    expect(url).toContain('state=test-state');
    expect(url).toContain('code_challenge=test-challenge');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');

    // Check scopes
    const decodedUrl = decodeURIComponent(url);
    expect(decodedUrl).toContain('https://www.googleapis.com/auth/gmail.modify');
    expect(decodedUrl).toContain('https://www.googleapis.com/auth/calendar');
    expect(decodedUrl).toContain('https://www.googleapis.com/auth/drive');
    expect(decodedUrl).toContain('https://www.googleapis.com/auth/documents');
    expect(decodedUrl).toContain('https://www.googleapis.com/auth/userinfo.profile');
  });

  it('should successfully exchange code for tokens', async () => {
    // Mock the global fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'mock-access-token',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        scope: 'mock-scope',
        token_type: 'Bearer',
      }),
    } as unknown as Response);

    const tokens = await exchangeCodeForTokens('mock-code', 'mock-verifier');

    expect(tokens.access_token).toBe('mock-access-token');
    expect(tokens.refresh_token).toBe('mock-refresh-token');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    );
  });

  it('should throw an error when token exchange fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'invalid_grant',
    } as unknown as Response);

    await expect(exchangeCodeForTokens('mock-code', 'mock-verifier')).rejects.toThrow('Failed to exchange token: invalid_grant');
  });
});
