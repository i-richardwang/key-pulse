'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  ProxyConfigForm,
  getDefaultProxyConfig,
  proxyConfigFromRecord,
  proxyConfigToApi,
  type ProxyConfig,
} from '@/components/ui/proxy-config-form';
import {
  ModelSelector,
  getFinalModel,
  initModelState,
} from '@/components/ui/model-selector';
import { ENV_CONFIG } from '@/lib/env-config';
import type { ApiKey } from '@/types';

interface KeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editKey?: ApiKey | null;
  onSave: (data: {
    key?: string;
    baseUrl: string;
    model: string;
    proxy?: {
      type: 'http' | 'socks5';
      host: string;
      port: number;
      username?: string;
      password?: string;
    } | null;
  }) => Promise<void>;
}

export function KeyDialog({ open, onOpenChange, editKey, onSave }: KeyDialogProps) {
  const [key, setKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [proxy, setProxy] = useState<ProxyConfig>(getDefaultProxyConfig());
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!editKey;

  useEffect(() => {
    if (open) {
      if (editKey) {
        // Edit mode: use existing data
        setKey('');
        setBaseUrl(editKey.baseUrl);
        const modelState = initModelState(editKey.model);
        setModel(modelState.selected);
        setCustomModel(modelState.custom);
        setProxy(proxyConfigFromRecord(editKey));
      } else {
        // Add mode: use env defaults
        setKey('');
        setBaseUrl(ENV_CONFIG.baseUrl);
        const modelState = initModelState(ENV_CONFIG.model);
        setModel(modelState.selected);
        setCustomModel(modelState.custom);
        setProxy(getDefaultProxyConfig());
      }
    }
  }, [open, editKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSave({
        key: isEditing ? undefined : key,
        baseUrl,
        model: getFinalModel(model, customModel),
        proxy: proxyConfigToApi(proxy),
      });
      onOpenChange(false);
    } catch {
      // Error handled by parent with toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑 Key' : '添加 Key'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {/* API Key */}
            {!isEditing ? (
              <Field>
                <FieldLabel htmlFor="key">API Key</FieldLabel>
                <Input
                  id="key"
                  placeholder="sk-..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="font-mono"
                  required
                />
              </Field>
            ) : (
              <Field>
                <FieldLabel>API Key</FieldLabel>
                <div className="text-sm font-mono text-muted-foreground bg-muted px-3 py-2 rounded-md">
                  {editKey?.maskedKey}
                </div>
              </Field>
            )}

            {/* Base URL & Model */}
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

            {/* Proxy */}
            <ProxyConfigForm value={proxy} onChange={setProxy} />
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading || (!isEditing && !key)}>
              {isLoading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
