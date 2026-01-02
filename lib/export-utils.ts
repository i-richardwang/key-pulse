import type { ValidationResult, ExportOptions } from '@/types';

function filterResults(
  results: ValidationResult[],
  content: ExportOptions['content']
): ValidationResult[] {
  switch (content) {
    case 'valid':
      return results.filter((r) => r.status === 'valid');
    case 'invalid':
      return results.filter((r) => r.status !== 'valid');
    default:
      return results;
  }
}

export function exportToJSON(
  results: ValidationResult[],
  options: ExportOptions
): string {
  const filtered = filterResults(results, options.content);

  if (options.includeDetails) {
    return JSON.stringify(filtered, null, 2);
  }

  return JSON.stringify(
    filtered.map((r) => ({
      key: r.key,
      status: r.status,
      errorMessage: r.errorMessage,
    })),
    null,
    2
  );
}

export function exportToCSV(
  results: ValidationResult[],
  options: ExportOptions
): string {
  const filtered = filterResults(results, options.content);

  if (options.includeDetails) {
    const headers = ['Key', 'Status', 'Response Time (ms)', 'Error Code', 'Error Message', 'Timestamp'];
    const rows = filtered.map((r) => [
      r.key,
      r.status,
      r.responseTime?.toString() || '',
      r.errorCode || '',
      r.errorMessage?.replace(/"/g, '""') || '',
      new Date(r.timestamp).toISOString(),
    ]);

    return [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');
  }

  const headers = ['Key', 'Status'];
  const rows = filtered.map((r) => [r.key, r.status]);

  return [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
}

export function exportToTXT(
  results: ValidationResult[],
  options: ExportOptions
): string {
  const filtered = filterResults(results, options.content);

  if (options.includeDetails) {
    return filtered
      .map((r) => {
        const parts = [r.key, `[${r.status}]`];
        if (r.responseTime) parts.push(`${r.responseTime}ms`);
        if (r.errorMessage) parts.push(`- ${r.errorMessage}`);
        return parts.join(' ');
      })
      .join('\n');
  }

  return filtered.map((r) => r.key).join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function exportResults(
  results: ValidationResult[],
  options: ExportOptions
): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  let content: string;
  let filename: string;
  let mimeType: string;

  switch (options.format) {
    case 'json':
      content = exportToJSON(results, options);
      filename = `keypulse-export-${timestamp}.json`;
      mimeType = 'application/json';
      break;
    case 'csv':
      content = exportToCSV(results, options);
      filename = `keypulse-export-${timestamp}.csv`;
      mimeType = 'text/csv';
      break;
    case 'txt':
    default:
      content = exportToTXT(results, options);
      filename = `keypulse-export-${timestamp}.txt`;
      mimeType = 'text/plain';
      break;
  }

  downloadFile(content, filename, mimeType);
}
