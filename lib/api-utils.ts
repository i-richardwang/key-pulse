/**
 * API utility functions
 */
import { NextResponse } from 'next/server';
import type { z } from 'zod';

/**
 * Parse and validate request body against a Zod schema
 * Returns either validated data or an error response
 */
export async function parseBody<T extends z.ZodSchema>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.issues.map(i => i.message).join(', ');
      return { error: NextResponse.json({ error: errors }, { status: 400 }) };
    }

    return { data: result.data };
  } catch {
    return { error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) };
  }
}

/**
 * Validate data against a Zod schema (for client-side use)
 * Returns either validated data or error message
 */
export function validate<T extends z.ZodSchema>(
  data: unknown,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message || 'Validation failed' };
  }

  return { success: true, data: result.data };
}
