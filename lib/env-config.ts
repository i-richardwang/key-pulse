/**
 * 环境变量配置
 * 用于读取默认的 API 和代理配置
 */

import type { ProxyConfig, ValidationConfig } from '@/types';

/**
 * 从环境变量获取代理配置
 */
export function getProxyConfigFromEnv(): ProxyConfig | null {
  const proxyType = process.env.NEXT_PUBLIC_PROXY_TYPE;
  const proxyHost = process.env.NEXT_PUBLIC_PROXY_HOST;
  const proxyPort = process.env.NEXT_PUBLIC_PROXY_PORT;

  if (!proxyType || !proxyHost || !proxyPort) {
    return null;
  }

  const proxy: ProxyConfig = {
    type: proxyType as 'http' | 'socks5',
    host: proxyHost,
    port: parseInt(proxyPort, 10),
  };

  // 添加认证信息（如果有）
  const username = process.env.NEXT_PUBLIC_PROXY_USERNAME;
  const password = process.env.NEXT_PUBLIC_PROXY_PASSWORD;

  if (username && password) {
    proxy.auth = { username, password };
  }

  return proxy;
}

/**
 * 从环境变量获取默认配置
 */
export function getDefaultConfigFromEnv(): ValidationConfig {
  return {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || process.env.DEFAULT_BASE_URL || 'https://api.openai.com',
    model: process.env.NEXT_PUBLIC_API_MODEL || process.env.DEFAULT_MODEL || 'gpt-3.5-turbo',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
    concurrency: parseInt(process.env.NEXT_PUBLIC_API_CONCURRENCY || '1', 10),
    proxy: getProxyConfigFromEnv(),
  };
}

/**
 * 检查是否配置了环境变量
 */
export function hasEnvConfig(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.DEFAULT_BASE_URL ||
    process.env.NEXT_PUBLIC_PROXY_HOST
  );
}

// 导出默认配置（客户端可用）
export const ENV_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || process.env.DEFAULT_BASE_URL || 'https://api.openai.com',
  model: process.env.NEXT_PUBLIC_API_MODEL || process.env.DEFAULT_MODEL || 'gpt-3.5-turbo',
  proxy: {
    type: process.env.NEXT_PUBLIC_PROXY_TYPE || null,
    host: process.env.NEXT_PUBLIC_PROXY_HOST || '',
    port: process.env.NEXT_PUBLIC_PROXY_PORT || '',
    username: process.env.NEXT_PUBLIC_PROXY_USERNAME || '',
    password: process.env.NEXT_PUBLIC_PROXY_PASSWORD || '',
  },
};
