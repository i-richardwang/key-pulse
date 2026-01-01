import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookie, validatePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: '请输入密码' }, { status: 400 });
    }

    if (!validatePassword(password)) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    await setAuthCookie(password);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
