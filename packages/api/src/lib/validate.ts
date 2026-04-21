import { z } from 'zod';
import { Context } from 'hono';

/**
 * Validates request body against a Zod schema
 * Returns a formatted 400 response on failure
 */
export async function validate<T>(c: Context, schema: z.Schema<T>): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  try {
    const body = await c.req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        response: c.json({
          error: 'validation_failed',
          issues: result.error.issues.map(i => ({
            path: i.path,
            message: i.message
          }))
        }, 400)
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      response: c.json({
        error: 'validation_failed',
        message: 'Invalid JSON body'
      }, 400)
    };
  }
}
