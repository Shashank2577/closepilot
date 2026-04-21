import type { Context, MiddlewareHandler, Next } from 'hono';
import { jwtVerify } from 'jose';
import type { AuthUser, UserRole } from '@closepilot/core';
import { errorResponse } from '../lib/errors.js';
import type { AppContext } from '../types.js';

export const authMiddleware: MiddlewareHandler<AppContext> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(errorResponse('Unauthorized'), 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return c.json(errorResponse('Server misconfiguration: JWT_SECRET not set'), 500);
    }
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);

    // Attach user to context
    c.set('user', payload as unknown as AuthUser);
    await next();
  } catch (error) {
    return c.json(errorResponse('Unauthorized'), 401);
  }
};

export const requireRole = (roles: UserRole[]): MiddlewareHandler<AppContext> => {
  return async (c, next) => {
    let authResponse: Response | undefined;

    // Run auth middleware first to ensure user is authenticated
    authResponse = await authMiddleware(c, async () => {
      // This runs if auth succeeds
    });

    if (authResponse) {
       return authResponse;
    }

    const user = c.get('user') as AuthUser;

    // Check if user was set
    if (!user) {
        return c.json(errorResponse('Unauthorized'), 401);
    }

    if (!roles.includes(user.role)) {
      return c.json(errorResponse('Forbidden'), 403);
    }

    await next();
  };
};
