import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

describe('User API Route', () => {
  it('should return 401 if access token is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/user');

    const response = await GET(req);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should fetch user info from Google when access token is present', async () => {
    const req = new NextRequest('http://localhost:3000/api/user');

    // Set cookie on request
    req.cookies.set('access_token', 'valid-mock-token');

    const mockUserInfo = {
      name: 'John Doe',
      email: 'john@example.com',
      picture: 'http://example.com/pic.jpg',
    };

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUserInfo,
    } as unknown as Response);

    const response = await GET(req);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockUserInfo);

    // Verify fetch was called with correct header
    expect(global.fetch).toHaveBeenCalledWith('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: 'Bearer valid-mock-token',
      },
    });
  });

  it('should return 401 if Google fetch fails', async () => {
    const req = new NextRequest('http://localhost:3000/api/user');
    req.cookies.set('access_token', 'invalid-mock-token');

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Invalid token',
    } as unknown as Response);

    const response = await GET(req);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch user info');
  });
});
