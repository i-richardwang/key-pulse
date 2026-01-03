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
import { useProviders } from '@/hooks/use-providers';
import { keyAddSchema } from '@/lib/schemas';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ApiKeyWithRelations } from '@/hooks/use-keys';

interface KeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editKey?: ApiKeyWithRelations | null;
  onSave: (data: {
    key?: string;
    providerId: string;
    name?: string | null;
    models?: string[] | null;
    weight?: number | null;
    enabled?: boolean | null;
    useForBatchApi?: boolean | null;
  }) => Promise<void>;
}

export function KeyDialog({ open, onOpenChange, editKey, onSave }: KeyDialogProps) {
  const { data: providers, isLoading: providersLoading } = useProviders();

  const [key, setKey] = useState('');
  const [providerId, setProviderId] = useState('');
  const [name, setName] = useState('');
  const [modelsInput, setModelsInput] = useState('');
  const [weight, setWeight] = useState(1.0);
  const [enabled, setEnabled] = useState(true);
  const [useForBatchApi, setUseForBatchApi] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!editKey;
  const defaultProvider = providers.find(p => p.isDefault);

  useEffect(() => {
    if (open) {
      if (editKey) {
        setKey('');
        setProviderId(editKey.providerId);
        setName(editKey.name || '');
        setModelsInput(editKey.models?.join(', ') || '');
        setWeight(editKey.weight ?? 1.0);
        setEnabled(editKey.enabled ?? true);
        setUseForBatchApi(editKey.useForBatchApi ?? false);
        setShowAdvanced(!!editKey.name || !!editKey.models?.length);
      } else {
        setKey('');
        setProviderId(defaultProvider?.id || providers[0]?.id || '');
        setName('');
        setModelsInput('');
        setWeight(1.0);
        setEnabled(true);
        setUseForBatchApi(false);
        setShowAdvanced(false);
      }
    }
  }, [open, editKey, providers, defaultProvider]);

  const selectedProvider = providers.find(p => p.id === providerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing) {
      const result = keyAddSchema.safeParse({ key, providerId });
      if (!result.success) {
        toast.error(result.error.issues[0]?.message || 'Validation failed');
        return;
      }
    }

    setIsLoading(true);

    try {
      const models = modelsInput.trim()
        ? modelsInput.split(',').map(m => m.trim()).filter(Boolean)
        : null;

      await onSave({
        key: isEditing ? undefined : key,
        providerId,
        name: name.trim() || null,
        models,
        weight,
        enabled,
        useForBatchApi,
      });
      onOpenChange(false);
    } catch {
      // Error handled by parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Key' : 'Add Key'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
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

            <Field>
              <FieldLabel htmlFor="provider">Provider</FieldLabel>
              <Select
                value={providerId}
                onValueChange={setProviderId}
                disabled={providersLoading || providers.length === 0}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder={providers.length === 0 ? 'Add a Provider first' : 'Select Provider'} />
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

            {selectedProvider && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm space-y-1">
                <div className="text-muted-foreground">
                  Base URL: <span className="font-mono text-foreground">{selectedProvider.baseUrl}</span>
                </div>
                <div className="text-muted-foreground">
                  Model: <span className="text-foreground">{selectedProvider.model}</span>
                </div>
                <div className="text-muted-foreground">
                  Proxy: <span className="text-foreground">
                    {selectedProvider.proxy
                      ? `${selectedProvider.proxy.host}:${selectedProvider.proxy.port}`
                      : 'None'}
                  </span>
                </div>
              </div>
            )}

            {/* Bifrost Settings */}
            <div className="border-t pt-4 mt-2">
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Bifrost Settings
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <Field>
                    <FieldLabel htmlFor="key-name">Name</FieldLabel>
                    <Input
                      id="key-name"
                      placeholder="My API Key"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="key-models">Models</FieldLabel>
                    <Input
                      id="key-models"
                      placeholder="gpt-4, gpt-3.5-turbo"
                      value={modelsInput}
                      onChange={(e) => setModelsInput(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="key-weight">Weight (0.1-1.0)</FieldLabel>
                    <Input
                      id="key-weight"
                      type="number"
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      value={weight}
                      onChange={(e) => setWeight(parseFloat(e.target.value) || 1.0)}
                    />
                  </Field>

                  <div className="flex gap-6">
                    <Field orientation="horizontal">
                      <Switch checked={enabled} onCheckedChange={setEnabled} />
                      <FieldLabel>Enabled</FieldLabel>
                    </Field>

                    <Field orientation="horizontal">
                      <Switch checked={useForBatchApi} onCheckedChange={setUseForBatchApi} />
                      <FieldLabel>Batch API</FieldLabel>
                    </Field>
                  </div>
                </div>
              )}
            </div>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (!isEditing && !key) || !providerId || providers.length === 0}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
