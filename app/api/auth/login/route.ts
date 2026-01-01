import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookie, validatePassword } from '@/lib/auth';
import { parseBody } from '@/lib/api-utils';
import { loginSchema } from '@/lib/schemas';

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, loginSchema);
    if ('error' in parsed) return parsed.error;

    const { password } = parsed.data;

    if (!validatePassword(password)) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    await setAuthCookie(password);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
