'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  ProxyConfigForm,
  createEmptyProxyConfig,
  type ProxyConfig,
} from '@/components/ui/proxy-config-form';
import {
  ModelSelector,
  getFinalModel,
} from '@/components/ui/model-selector';

interface BatchEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onSave: (updates: {
    baseUrl?: string;
    model?: string;
    proxyType?: string | null;
    proxyHost?: string | null;
    proxyPort?: number | null;
    proxyUsername?: string | null;
    proxyPassword?: string | null;
  }) => Promise<void>;
}

export function BatchEditDialog({ open, onOpenChange, selectedCount, onSave }: BatchEditDialogProps) {
  const [updateBaseUrl, setUpdateBaseUrl] = useState(false);
  const [updateModel, setUpdateModel] = useState(false);
  const [updateProxy, setUpdateProxy] = useState(false);

  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [proxy, setProxy] = useState<ProxyConfig>(createEmptyProxyConfig());
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updates: Record<string, unknown> = {};

      if (updateBaseUrl && baseUrl) {
        updates.baseUrl = baseUrl;
      }

      if (updateModel) {
        updates.model = getFinalModel(model, customModel);
      }

      if (updateProxy) {
        if (proxy.enabled && proxy.host && proxy.port) {
          updates.proxyType = proxy.type;
          updates.proxyHost = proxy.host;
          updates.proxyPort = parseInt(proxy.port, 10);
          updates.proxyUsername = proxy.username || null;
          updates.proxyPassword = proxy.password || null;
        } else {
          updates.proxyType = null;
          updates.proxyHost = null;
          updates.proxyPort = null;
          updates.proxyUsername = null;
          updates.proxyPassword = null;
        }
      }

      if (Object.keys(updates).length === 0) {
        onOpenChange(false);
        return;
      }

      await onSave(updates);
      onOpenChange(false);
    } catch {
      // Error handled by parent with toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state
      setUpdateBaseUrl(false);
      setUpdateModel(false);
      setUpdateProxy(false);
      setBaseUrl('');
      setModel('');
      setCustomModel('');
      setProxy(createEmptyProxyConfig());
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>批量编辑</DialogTitle>
          <DialogDescription>
            修改已选中的 {selectedCount} 个 Key。只有勾选的字段会被更新。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {/* Base URL */}
            <Field orientation="horizontal">
              <Switch checked={updateBaseUrl} onCheckedChange={setUpdateBaseUrl} />
              <FieldLabel>修改 Base URL</FieldLabel>
            </Field>
            {updateBaseUrl && (
              <Input
                placeholder="https://api.openai.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            )}

            {/* Model */}
            <Field orientation="horizontal">
              <Switch checked={updateModel} onCheckedChange={setUpdateModel} />
              <FieldLabel>修改模型</FieldLabel>
            </Field>
            {updateModel && (
              <ModelSelector
                value={model}
                onChange={setModel}
                customValue={customModel}
                onCustomChange={setCustomModel}
              />
            )}

            {/* Proxy */}
            <div className="border-t pt-4">
              <Field orientation="horizontal">
                <Switch checked={updateProxy} onCheckedChange={setUpdateProxy} />
                <FieldLabel>修改代理配置</FieldLabel>
              </Field>

              {updateProxy && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <ProxyConfigForm value={proxy} onChange={setProxy} compact />
                </div>
              )}
            </div>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              取消
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (!updateBaseUrl && !updateModel && !updateProxy)}
            >
              {isLoading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
