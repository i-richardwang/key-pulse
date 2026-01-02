'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card';
import { RefreshCwIcon, CheckCircle2Icon, XCircleIcon, AlertCircleIcon, Loader2Icon } from 'lucide-react';

interface SyncStatus {
  configured: boolean;
  apiUrl: string | null;
  hasDbConnection: boolean;
}

interface SyncResult {
  success: boolean;
  stats: {
    providers: { created: number; updated: number; skipped: number };
    keys: { created: number; updated: number; skipped: number };
  };
  message: string;
}

export function BifrostPanel() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/sync');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setLastResult(null);

    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setLastResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setLastResult({
        success: false,
        stats: { providers: { created: 0, updated: 0, skipped: 0 }, keys: { created: 0, updated: 0, skipped: 0 } },
        message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2Icon className="size-5 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Bifrost API</span>
            {status?.apiUrl ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {status.apiUrl}
                </Badge>
                <CheckCircle2Icon className="size-4 text-green-500" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Not configured</span>
                <XCircleIcon className="size-4 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Bifrost Database</span>
            {status?.hasDbConnection ? (
              <div className="flex items-center gap-2">
                <span className="text-green-600">Connected</span>
                <CheckCircle2Icon className="size-4 text-green-500" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Not configured</span>
                <XCircleIcon className="size-4 text-muted-foreground" />
              </div>
            )}
          </div>

          {!status?.configured && (
            <div className="flex items-start gap-2 rounded-md bg-muted p-3 mt-2">
              <AlertCircleIcon className="size-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="space-y-1">
                <p>Configure Bifrost connection in your environment variables:</p>
                <pre className="bg-background rounded p-2 overflow-x-auto">
{`BIFROST_API_URL=http://localhost:8080
BIFROST_DATABASE_URL=postgresql://...`}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Action */}
      <Card>
        <CardHeader>
          <CardTitle>Sync from Bifrost</CardTitle>
          <CardDescription>
            Import providers and API keys from your Bifrost instance
          </CardDescription>
          <CardAction>
            <Button
              onClick={handleSync}
              disabled={!status?.configured || isSyncing}
            >
              {isSyncing ? (
                <Loader2Icon data-icon="inline-start" className="animate-spin" />
              ) : (
                <RefreshCwIcon data-icon="inline-start" />
              )}
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </CardAction>
        </CardHeader>

        {lastResult && (
          <CardContent>
            <div className={`rounded-md p-3 ${lastResult.success ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                {lastResult.success ? (
                  <CheckCircle2Icon className="size-4 text-green-500" />
                ) : (
                  <XCircleIcon className="size-4 text-red-500" />
                )}
                <span className="font-medium">{lastResult.success ? 'Sync completed' : 'Sync failed'}</span>
              </div>
              {lastResult.success ? (
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>
                    Providers: {lastResult.stats.providers.created} created, {lastResult.stats.providers.updated} updated
                    {lastResult.stats.providers.skipped > 0 && `, ${lastResult.stats.providers.skipped} skipped`}
                  </div>
                  <div>
                    Keys: {lastResult.stats.keys.created} created, {lastResult.stats.keys.updated} updated
                    {lastResult.stats.keys.skipped > 0 && `, ${lastResult.stats.keys.skipped} skipped`}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">{lastResult.message}</p>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
