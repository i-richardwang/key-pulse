export interface BifrostProxyConfig {
  type: 'none' | 'http' | 'socks5' | 'environment';
  url?: string;
  username?: string;
  password?: string;
  ca_cert_pem?: string;
}

export interface BifrostNetworkConfig {
  base_url?: string;
  extra_headers?: Record<string, string>;
  default_request_timeout_in_seconds?: number;
  max_retries?: number;
  retry_backoff_initial?: number;
  retry_backoff_max?: number;
}

export interface BifrostConcurrencyConfig {
  concurrency?: number;
  buffer_size?: number;
}

export interface BifrostAllowedRequests {
  list_models?: boolean;
  text_completion?: boolean;
  text_completion_stream?: boolean;
  chat_completion?: boolean;
  chat_completion_stream?: boolean;
  responses?: boolean;
  responses_stream?: boolean;
  count_tokens?: boolean;
  embedding?: boolean;
  speech?: boolean;
  speech_stream?: boolean;
  transcription?: boolean;
  transcription_stream?: boolean;
  batch_create?: boolean;
  batch_list?: boolean;
  batch_retrieve?: boolean;
  batch_cancel?: boolean;
  batch_results?: boolean;
  file_upload?: boolean;
  file_list?: boolean;
  file_retrieve?: boolean;
  file_delete?: boolean;
  file_content?: boolean;
}

export interface BifrostCustomProviderConfig {
  base_provider_type?: string;
  is_key_less?: boolean;
  allowed_requests?: BifrostAllowedRequests;
  request_path_overrides?: Record<string, string>;
}

export interface BifrostProvider {
  name: string;
  network_config?: BifrostNetworkConfig;
  concurrency_and_buffer_size?: BifrostConcurrencyConfig;
  proxy_config?: BifrostProxyConfig;
  send_back_raw_request?: boolean;
  send_back_raw_response?: boolean;
  custom_provider_config?: BifrostCustomProviderConfig;
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
