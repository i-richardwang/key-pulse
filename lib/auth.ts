import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'keypulse-auth';

function getAuthPassword(): string | undefined {
  return process.env.AUTH_PASSWORD;
}

export function validatePassword(password: string): boolean {
  const authPassword = getAuthPassword();
  if (!authPassword) return true; // No password configured = dev mode
  return password === authPassword;
}

export function isAuthRequired(): boolean {
  return !!getAuthPassword();
}

export async function isAuthenticated(): Promise<boolean> {
  const authPassword = getAuthPassword();
  if (!authPassword) return true;

  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  return authCookie?.value === authPassword;
}

export async function setAuthCookie(password: string): Promise<boolean> {
  if (!validatePassword(password)) return false;

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return true;
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
