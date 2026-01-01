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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  ProxyConfigForm,
  getDefaultProxyConfig,
  proxyConfigToApi,
  type ProxyConfig,
} from '@/components/ui/proxy-config-form';
import {
  ModelSelector,
  getFinalModel,
  initModelState,
} from '@/components/ui/model-selector';
import { ENV_CONFIG } from '@/lib/env-config';

interface BatchAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (keys: Array<{
    key: string;
    baseUrl: string;
    model: string;
    proxy?: {
      type: 'http' | 'socks5';
      host: string;
      port: number;
      username?: string;
      password?: string;
    };
  }>) => Promise<void>;
}

function parseKeys(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('//'));
}

export function BatchAddDialog({ open, onOpenChange, onSave }: BatchAddDialogProps) {
  const [rawKeys, setRawKeys] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [proxy, setProxy] = useState<ProxyConfig>(getDefaultProxyConfig());
  const [isLoading, setIsLoading] = useState(false);

  const parsedKeys = useMemo(() => parseKeys(rawKeys), [rawKeys]);
  const uniqueKeys = useMemo(() => [...new Set(parsedKeys)], [parsedKeys]);

  useEffect(() => {
    if (open) {
      setRawKeys('');
      setBaseUrl(ENV_CONFIG.baseUrl);
      const modelState = initModelState(ENV_CONFIG.model);
      setModel(modelState.selected);
      setCustomModel(modelState.custom);
      setProxy(getDefaultProxyConfig());
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uniqueKeys.length === 0) return;

    setIsLoading(true);

    try {
      const finalModel = getFinalModel(model, customModel);
      const proxyData = proxyConfigToApi(proxy);

      const keysToAdd = uniqueKeys.map(key => ({
        key,
        baseUrl,
        model: finalModel,
        proxy: proxyData || undefined,
      }));

      await onSave(keysToAdd);
      onOpenChange(false);
    } catch {
      // Error handled by parent with toast
    } finally {
      setIsLoading(false);
    }
  };

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

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="baseUrl">Base URL</FieldLabel>
                <Input
                  id="baseUrl"
                  placeholder="https://api.openai.com"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  required
                />
              </Field>
              <ModelSelector
                value={model}
                onChange={setModel}
                customValue={customModel}
                onCustomChange={setCustomModel}
                required
              />
            </div>

            <ProxyConfigForm value={proxy} onChange={setProxy} />
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading || uniqueKeys.length === 0}>
              {isLoading ? '添加中...' : `添加 ${uniqueKeys.length} 个 Key`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
