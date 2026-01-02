export interface BifrostProvider {
  name: string;
  network_config: { base_url?: string };
  status: 'active' | 'error' | 'deleted';
}

export interface BifrostModel {
  name: string;
  provider: string;
}

export function isBifrostConfigured(): boolean {
  return !!process.env.BIFROST_API_URL;
}

async function bifrostFetch<T>(path: string): Promise<T> {
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

  const response = await fetch(`${apiUrl}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`Bifrost API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function fetchBifrostProviders(): Promise<BifrostProvider[]> {
  const data = await bifrostFetch<{ providers: BifrostProvider[] }>('/api/providers');
  return data.providers.filter(p => p.status === 'active');
}

export async function fetchBifrostModels(): Promise<BifrostModel[]> {
  const data = await bifrostFetch<{ models: BifrostModel[] }>('/api/models?limit=100');
  return data.models;
}
