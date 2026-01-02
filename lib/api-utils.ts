import { NextResponse } from 'next/server';
import type { z } from 'zod';

// Parse and validate request body against a Zod schema
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
