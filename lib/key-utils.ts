/**
 * Key 处理工具函数
 */

/**
 * Key 脱敏处理
 * 只显示前8位和后4位，中间用...代替
 */
export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 12) {
    return '****';
  }
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
}

/**
 * 解析用户输入的 Keys
 * 支持多行输入，自动去重、去空行、去首尾空格
 */
export function parseKeys(input: string): string[] {
  const lines = input.split('\n');
  const keys = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过空行和注释行
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('//')) {
      keys.add(trimmed);
    }
  }

  return Array.from(keys);
}

/**
 * 验证 Key 格式
 * OpenAI Key 通常以 sk- 开头，长度在 40-60 之间
 * 但也支持其他格式的 Key
 */
export function validateKeyFormat(key: string): boolean {
  const trimmed = key.trim();
  // 基本验证：非空且长度合理
  return trimmed.length >= 10 && trimmed.length <= 200;
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 格式化时间戳为本地时间字符串
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 降级方案
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      return false;
    }
  }
}
