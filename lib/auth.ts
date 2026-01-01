import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'keypulse-auth';

// Get auth password from environment
function getAuthPassword(): string | undefined {
  return process.env.AUTH_PASSWORD;
}

// Validate password and return boolean
export function validatePassword(password: string): boolean {
  const authPassword = getAuthPassword();
  if (!authPassword) {
    // If no password configured, allow access (development mode)
    return true;
  }
  return password === authPassword;
}

// Check if auth is required
export function isAuthRequired(): boolean {
  return !!getAuthPassword();
}

// Check if request is authenticated via cookie
export async function isAuthenticated(): Promise<boolean> {
  const authPassword = getAuthPassword();
  if (!authPassword) {
    return true; // No auth required if password not set
  }

  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  return authCookie?.value === authPassword;
}

// Set auth cookie
export async function setAuthCookie(password: string): Promise<boolean> {
  if (!validatePassword(password)) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return true;
}

// Clear auth cookie
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
