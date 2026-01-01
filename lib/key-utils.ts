/**
 * Key handling utility functions
 */

/**
 * Mask a key for display
 * Shows first 10 and last 6 characters, with 8 asterisks in between
 */
export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 16) {
    return '********';
  }
  return `${trimmed.slice(0, 10)}********${trimmed.slice(-6)}`;
}

/**
 * Parse user input keys
 * Supports newlines and commas, auto-trims, filters comments
 */
export function parseKeys(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));
}

/**
 * Format timestamp to local time string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
