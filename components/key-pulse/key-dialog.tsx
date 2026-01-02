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
import type { ApiKeyWithRelations } from '@/hooks/use-keys';

interface KeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editKey?: ApiKeyWithRelations | null;
  onSave: (data: {
    key?: string;
    providerId: string;
  }) => Promise<void>;
}

export function KeyDialog({ open, onOpenChange, editKey, onSave }: KeyDialogProps) {
  const { data: providers, isLoading: providersLoading } = useProviders();

  const [key, setKey] = useState('');
  const [providerId, setProviderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!editKey;
  const defaultProvider = providers.find(p => p.isDefault);

  useEffect(() => {
    if (open) {
      if (editKey) {
        setKey('');
        setProviderId(editKey.providerId);
      } else {
        setKey('');
        setProviderId(defaultProvider?.id || providers[0]?.id || '');
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
      await onSave({
        key: isEditing ? undefined : key,
        providerId,
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
