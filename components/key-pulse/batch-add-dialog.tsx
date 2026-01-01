'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { useProviders } from '@/hooks/use-providers';
import { useProxies } from '@/hooks/use-proxies';

interface BatchAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (keys: Array<{
    key: string;
    providerId: string;
    proxyId?: string | null;
  }>) => Promise<void>;
}

function parseKeys(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));
}

export function BatchAddDialog({ open, onOpenChange, onSave }: BatchAddDialogProps) {
  const { data: providers, isLoading: providersLoading } = useProviders();
  const { data: proxies, isLoading: proxiesLoading } = useProxies();

  const [rawKeys, setRawKeys] = useState('');
  const [providerId, setProviderId] = useState('');
  const [proxyId, setProxyId] = useState<string>('none');
  const [isLoading, setIsLoading] = useState(false);

  const parsedKeys = useMemo(() => parseKeys(rawKeys), [rawKeys]);
  const uniqueKeys = useMemo(() => [...new Set(parsedKeys)], [parsedKeys]);

  // Get default provider/proxy
  const defaultProvider = providers.find(p => p.isDefault);
  const defaultProxy = proxies.find(p => p.isDefault);

  useEffect(() => {
    if (open) {
      setRawKeys('');
      setProviderId(defaultProvider?.id || providers[0]?.id || '');
      setProxyId(defaultProxy?.id || 'none');
    }
  }, [open, providers, proxies, defaultProvider, defaultProxy]);

  const selectedProvider = providers.find(p => p.id === providerId);
  const selectedProxy = proxyId !== 'none' ? proxies.find(p => p.id === proxyId) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uniqueKeys.length === 0) return;

    setIsLoading(true);

    try {
      const keysToAdd = uniqueKeys.map(key => ({
        key,
        providerId,
        proxyId: proxyId === 'none' ? null : proxyId,
      }));

      await onSave(keysToAdd);
      onOpenChange(false);
    } catch {
      // Error handled by parent with toast
    } finally {
      setIsLoading(false);
    }
  };

  const isFormLoading = providersLoading || proxiesLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>批量添加 Keys</DialogTitle>
          <DialogDescription>
            每行一个 Key，支持逗号分隔。以 # 或 // 开头的行会被忽略。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="keys">API Keys</FieldLabel>
                {uniqueKeys.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {uniqueKeys.length} 个有效 Key
                    {parsedKeys.length !== uniqueKeys.length && ` (${parsedKeys.length - uniqueKeys.length} 个重复)`}
                  </span>
                )}
              </div>
              <Textarea
                id="keys"
                placeholder="sk-xxx...&#10;sk-yyy...&#10;sk-zzz..."
                value={rawKeys}
                onChange={(e) => setRawKeys(e.target.value)}
                rows={5}
                className="font-mono"
              />
            </Field>

            {/* Provider */}
            <Field>
              <FieldLabel htmlFor="batch-provider">Provider</FieldLabel>
              <Select
                value={providerId}
                onValueChange={setProviderId}
                disabled={isFormLoading || providers.length === 0}
              >
                <SelectTrigger id="batch-provider">
                  <SelectValue placeholder={providers.length === 0 ? '请先添加 Provider' : '选择 Provider'} />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.model})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Provider Details */}
            {selectedProvider && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm space-y-1">
                <div className="text-muted-foreground">
                  Base URL: <span className="font-mono text-foreground">{selectedProvider.baseUrl}</span>
                </div>
                <div className="text-muted-foreground">
                  Model: <span className="text-foreground">{selectedProvider.model}</span>
                </div>
              </div>
            )}

            {/* Proxy */}
            <Field>
              <FieldLabel htmlFor="batch-proxy">Proxy (可选)</FieldLabel>
              <Select
                value={proxyId}
                onValueChange={setProxyId}
                disabled={isFormLoading}
              >
                <SelectTrigger id="batch-proxy">
                  <SelectValue placeholder="选择 Proxy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不使用代理</SelectItem>
                  {proxies.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.host}:{p.port})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Proxy Details */}
            {selectedProxy && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <span className="text-muted-foreground">类型: </span>
                <span className="font-mono">{selectedProxy.type.toUpperCase()}</span>
                <span className="text-muted-foreground ml-3">地址: </span>
                <span className="font-mono">{selectedProxy.host}:{selectedProxy.port}</span>
              </div>
            )}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              type="submit"
              disabled={isLoading || uniqueKeys.length === 0 || !providerId || providers.length === 0}
            >
              {isLoading ? '添加中...' : `添加 ${uniqueKeys.length} 个 Key`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
