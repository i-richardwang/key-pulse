import type {
  BifrostProvider,
  BifrostProviderPayload,
  BifrostModel,
} from '@/types/bifrost';

export function isBifrostConfigured(): boolean {
  return !!process.env.BIFROST_API_URL;
}

async function bifrostRequest<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown
): Promise<T> {
  const apiUrl = process.env.BIFROST_API_URL?.replace(/\/$/, '');
  if (!apiUrl) {
    throw new Error('BIFROST_API_URL is not configured');
  }

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const username = process.env.BIFROST_USERNAME;
  const password = process.env.BIFROST_PASSWORD;
  if (username && password) {
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Bifrost API error: ${response.status} ${await response.text()}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

export async function fetchBifrostProviders(): Promise<BifrostProvider[]> {
  const data = await bifrostRequest<{ providers: BifrostProvider[] }>('/api/providers');
  return data.providers.filter(p => p.status === 'active');
}

export async function fetchBifrostModels(): Promise<BifrostModel[]> {
  const data = await bifrostRequest<{ models: BifrostModel[] }>('/api/models?limit=100');
  return data.models;
}

export async function getBifrostProvider(name: string): Promise<BifrostProvider | null> {
  try {
    return await bifrostRequest<BifrostProvider>(`/api/providers/${encodeURIComponent(name)}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

export async function createBifrostProvider(payload: BifrostProviderPayload): Promise<BifrostProvider> {
  return bifrostRequest<BifrostProvider>('/api/providers', 'POST', payload);
}

// PUT requires full configuration - partial updates not supported
export async function updateBifrostProvider(
  name: string,
  payload: BifrostProviderPayload
): Promise<BifrostProvider> {
  return bifrostRequest<BifrostProvider>(`/api/providers/${encodeURIComponent(name)}`, 'PUT', payload);
}

export function parseProxyUrl(url: string): { host: string; port: number } | null {
  try {
    const parsed = new URL(url);
    const port = parsed.port ? parseInt(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80);
    return { host: parsed.hostname, port };
  } catch {
    return null;
  }
}
