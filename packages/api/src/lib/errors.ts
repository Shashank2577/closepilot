export function errorResponse(error: string, code?: string, details?: unknown) {
  return { error, code, details };
}
