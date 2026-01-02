import { NextRequest, NextResponse } from 'next/server';
import { db, apiKeys, providers } from '@/db';
import { eq, and, like, SQL } from 'drizzle-orm';
import { decrypt } from '@/lib/crypto';
import { parseBody } from '@/lib/api-utils';
import { keyExportSchema } from '@/lib/schemas';
import type { ApiKeyStatus } from '@/db/schema';

type ExportRow = {
  key: string;
  status: ApiKeyStatus;
  responseTime: number | null;
  errorMessage: string | null;
  lastValidatedAt: Date | null;
};

function filterByContent(rows: ExportRow[], content: 'all' | 'valid' | 'invalid'): ExportRow[] {
  switch (content) {
    case 'valid':
      return rows.filter(r => r.status === 'valid');
    case 'invalid':
      return rows.filter(r => r.status !== 'valid' && r.status !== 'pending');
    default:
      return rows;
  }
}

function toJSON(rows: ExportRow[], includeDetails: boolean): string {
  if (includeDetails) {
    return JSON.stringify(rows.map(r => ({
      key: r.key,
      status: r.status,
      responseTime: r.responseTime,
      errorMessage: r.errorMessage,
      lastValidatedAt: r.lastValidatedAt?.toISOString() || null,
    })), null, 2);
  }
  return JSON.stringify(rows.map(r => ({
    key: r.key,
    status: r.status,
  })), null, 2);
}

function toCSV(rows: ExportRow[], includeDetails: boolean): string {
  if (includeDetails) {
    const headers = ['Key', 'Status', 'Response Time (ms)', 'Error Message', 'Last Validated'];
    const csvRows = rows.map(r => [
      r.key,
      r.status,
      r.responseTime?.toString() || '',
      r.errorMessage?.replace(/"/g, '""') || '',
      r.lastValidatedAt?.toISOString() || '',
    ]);
    return [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
  }

  const headers = ['Key', 'Status'];
  const csvRows = rows.map(r => [r.key, r.status]);
  return [
    headers.join(','),
    ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
}

function toTXT(rows: ExportRow[], includeDetails: boolean): string {
  if (includeDetails) {
    return rows.map(r => {
      const parts = [r.key, `[${r.status}]`];
      if (r.responseTime) parts.push(`${r.responseTime}ms`);
      if (r.errorMessage) parts.push(`- ${r.errorMessage}`);
      return parts.join(' ');
    }).join('\n');
  }
  return rows.map(r => r.key).join('\n');
}

// POST /api/keys/export - Export keys (server-side decryption)
export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, keyExportSchema);
    if ('error' in parsed) return parsed.error;

    const { format, content, includeDetails, filters } = parsed.data;

    // Build where clause
    const conditions: SQL[] = [];
    if (filters?.status) {
      conditions.push(eq(apiKeys.status, filters.status as ApiKeyStatus));
    }
    if (filters?.providerId) {
      conditions.push(eq(apiKeys.providerId, filters.providerId));
    }
    if (filters?.search) {
      conditions.push(like(apiKeys.maskedKey, `%${filters.search}%`));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const keys = await db
      .select({
        key: apiKeys.key,
        status: apiKeys.status,
        responseTime: apiKeys.responseTime,
        errorMessage: apiKeys.errorMessage,
        lastValidatedAt: apiKeys.lastValidatedAt,
      })
      .from(apiKeys)
      .where(whereClause);

    // Decrypt keys and convert to export rows
    const decryptedRows: ExportRow[] = keys.map(row => ({
      key: decrypt(row.key),
      status: row.status as ApiKeyStatus,
      responseTime: row.responseTime,
      errorMessage: row.errorMessage,
      lastValidatedAt: row.lastValidatedAt,
    }));

    // Filter by content type
    const filtered = filterByContent(decryptedRows, content);

    // Generate export content
    let exportContent: string;
    let mimeType: string;
    let extension: string;

    switch (format) {
      case 'json':
        exportContent = toJSON(filtered, includeDetails);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        exportContent = toCSV(filtered, includeDetails);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'txt':
      default:
        exportContent = toTXT(filtered, includeDetails);
        mimeType = 'text/plain';
        extension = 'txt';
        break;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `keypulse-export-${timestamp}.${extension}`;

    return new NextResponse(exportContent, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting keys:', error);
    return NextResponse.json({ error: 'Failed to export keys' }, { status: 500 });
  }
}
