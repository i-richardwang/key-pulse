export interface BifrostProxyConfig {
  type: 'none' | 'http' | 'socks5' | 'environment';
  url?: string;
  username?: string;
  password?: string;
}

export interface BifrostProvider {
  name: string;
  network_config: { base_url?: string };
  proxy_config?: BifrostProxyConfig;
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

// Parse Bifrost proxy URL to host/port
export function parseProxyUrl(url: string): { host: string; port: number } | null {
  try {
    const parsed = new URL(url);
    const port = parsed.port ? parseInt(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80);
    return { host: parsed.hostname, port };
  } catch {
    return null;
  }
}
