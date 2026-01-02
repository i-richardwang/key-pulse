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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { useCreateProvider, useUpdateProvider, type ProviderWithDetails } from '@/hooks/use-providers';
import { useProxies } from '@/hooks/use-proxies';
import { providerSchema } from '@/lib/schemas';
import { toast } from 'sonner';

interface ProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProvider?: ProviderWithDetails | null;
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
  const [proxyId, setProxyId] = useState<string>('none');
  const [isDefault, setIsDefault] = useState(false);

  const { createProvider, isLoading: isCreating } = useCreateProvider();
  const { updateProvider, isLoading: isUpdating } = useUpdateProvider();
  const { data: proxies } = useProxies();

  const isEditing = !!editProvider;
  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (open) {
      if (editProvider) {
        setName(editProvider.name);
        setBaseUrl(editProvider.baseUrl);
        setModel(editProvider.model);
        setDescription(editProvider.description || '');
        setProxyId(editProvider.proxyId || 'none');
        setIsDefault(editProvider.isDefault || false);
      } else {
        setName('');
        setBaseUrl('');
        setModel('');
        setDescription('');
        setProxyId('none');
        setIsDefault(false);
      }
    }
  }, [open, editProvider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate with Zod
    const result = providerSchema.safeParse({
      name,
      baseUrl,
      model,
      description: description || undefined,
      proxyId: proxyId === 'none' ? undefined : proxyId,
      isDefault,
    });

    if (!result.success) {
      toast.error(result.error.issues[0]?.message || 'Validation failed');
      return;
    }

    try {
      if (isEditing) {
        await updateProvider({
          id: editProvider.id,
          name: result.data.name,
          baseUrl: result.data.baseUrl,
          model: result.data.model,
          description: result.data.description ?? null,
          proxyId: result.data.proxyId ?? null,
          isDefault: result.data.isDefault,
        });
        toast.success('Provider updated');
      } else {
        await createProvider({
          name: result.data.name,
          baseUrl: result.data.baseUrl,
          model: result.data.model,
          description: result.data.description ?? null,
          proxyId: result.data.proxyId ?? null,
          isDefault: result.data.isDefault,
        });
        toast.success('Provider created');
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Provider' : 'Add Provider'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="provider-name">Name</FieldLabel>
              <Input
                id="provider-name"
                placeholder="OpenAI"
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
                placeholder="gpt-4o"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="provider-proxy">Proxy (optional)</FieldLabel>
              <Select value={proxyId} onValueChange={setProxyId}>
                <SelectTrigger id="provider-proxy">
                  <SelectValue placeholder="No proxy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No proxy</SelectItem>
                  {proxies.map((proxy) => (
                    <SelectItem key={proxy.id} value={proxy.id}>
                      {proxy.name} ({proxy.host}:{proxy.port})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="provider-description">Description (optional)</FieldLabel>
              <Input
                id="provider-description"
                placeholder="Brief description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <Field orientation="horizontal">
              <Switch
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
              <FieldLabel>Set as default Provider</FieldLabel>
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name || !baseUrl || !model}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
