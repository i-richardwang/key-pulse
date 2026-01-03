/**
 * Masks an API key for display, showing first 10 and last 6 characters.
 * Keys shorter than 16 chars are fully masked.
 */
export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 16) return '********';
  return `${trimmed.slice(0, 10)}********${trimmed.slice(-6)}`;
}

/**
 * Parses user input containing multiple API keys.
 * Supports newline and comma separators, filters out comments (# or //).
 */
export function parseKeys(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));
}
