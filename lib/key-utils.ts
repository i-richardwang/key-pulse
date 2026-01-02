// Mask a key for display (first 10 + last 6 chars)
export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 16) {
    return '********';
  }
  return `${trimmed.slice(0, 10)}********${trimmed.slice(-6)}`;
}

// Parse user input keys (supports newlines, commas, filters comments)
export function parseKeys(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));
}
