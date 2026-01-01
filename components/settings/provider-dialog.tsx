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
import { Switch } from '@/components/ui/switch';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { useCreateProvider, useUpdateProvider } from '@/hooks/use-providers';
import { toast } from 'sonner';
import type { Provider } from '@/db/schema';

interface ProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProvider?: Provider | null;
  onSuccess: () => void;
}

export function ProviderDialog({
  open,
  onOpenChange,
  editProvider,
  onSuccess,
}: ProviderDialogProps) {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const { createProvider, isLoading: isCreating } = useCreateProvider();
  const { updateProvider, isLoading: isUpdating } = useUpdateProvider();

  const isEditing = !!editProvider;
  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (open) {
      if (editProvider) {
        setName(editProvider.name);
        setBaseUrl(editProvider.baseUrl);
        setModel(editProvider.model);
        setDescription(editProvider.description || '');
        setIsDefault(editProvider.isDefault || false);
      } else {
        setName('');
        setBaseUrl('https://api.openai.com');
        setModel('gpt-3.5-turbo');
        setDescription('');
        setIsDefault(false);
      }
    }
  }, [open, editProvider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing) {
        await updateProvider({
          id: editProvider.id,
          name,
          baseUrl,
          model,
          description: description || undefined,
          isDefault,
        });
        toast.success('Provider 已更新');
      } else {
        await createProvider({
          name,
          baseUrl,
          model,
          description: description || undefined,
          isDefault,
        });
        toast.success('Provider 已创建');
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑 Provider' : '添加 Provider'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="provider-name">名称</FieldLabel>
              <Input
                id="provider-name"
                placeholder="OpenAI GPT-4"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="provider-baseUrl">Base URL</FieldLabel>
              <Input
                id="provider-baseUrl"
                placeholder="https://api.openai.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="provider-model">Model</FieldLabel>
              <Input
                id="provider-model"
                placeholder="gpt-3.5-turbo"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="provider-description">描述 (可选)</FieldLabel>
              <Input
                id="provider-description"
                placeholder="简短描述"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <Field orientation="horizontal">
              <Switch
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
              <FieldLabel>设为默认 Provider</FieldLabel>
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading || !name || !baseUrl || !model}>
              {isLoading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
