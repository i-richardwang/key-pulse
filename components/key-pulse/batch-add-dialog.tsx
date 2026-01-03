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
import { parseKeys } from '@/lib/key-utils';
import { keyAddSchema } from '@/lib/schemas';
import { toast } from 'sonner';
import { z } from 'zod';

interface BatchAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (keys: Array<{
    key: string;
    providerId: string;
  }>) => Promise<void>;
}

export function BatchAddDialog({ open, onOpenChange, onSave }: BatchAddDialogProps) {
  const { data: providers, isLoading: providersLoading } = useProviders();

  const [rawKeys, setRawKeys] = useState('');
  const [providerId, setProviderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const parsedKeys = useMemo(() => parseKeys(rawKeys), [rawKeys]);
  const uniqueKeys = useMemo(() => [...new Set(parsedKeys)], [parsedKeys]);

  useEffect(() => {
    if (open) {
      setRawKeys('');
      setProviderId(providers[0]?.id || '');
    }
  }, [open, providers]);

  const selectedProvider = providers.find(p => p.id === providerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uniqueKeys.length === 0) return;

    const keysToAdd = uniqueKeys.map(key => ({ key, providerId }));

    const batchSchema = z.array(keyAddSchema).min(1).max(1000);
    const result = batchSchema.safeParse(keysToAdd);

    if (!result.success) {
      toast.error(result.error.issues[0]?.message || 'Validation failed');
      return;
    }

    setIsLoading(true);

    try {
      await onSave(result.data);
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
          <DialogTitle>Batch Add Keys</DialogTitle>
          <DialogDescription>
            One key per line, comma separated also supported. Lines starting with # or // will be ignored.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="keys">API Keys</FieldLabel>
                {uniqueKeys.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {uniqueKeys.length} valid keys
                    {parsedKeys.length !== uniqueKeys.length && ` (${parsedKeys.length - uniqueKeys.length} duplicates)`}
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

            <Field>
              <FieldLabel htmlFor="batch-provider">Provider</FieldLabel>
              <Select
                value={providerId}
                onValueChange={setProviderId}
                disabled={providersLoading || providers.length === 0}
              >
                <SelectTrigger id="batch-provider">
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
              disabled={isLoading || uniqueKeys.length === 0 || !providerId || providers.length === 0}
            >
              {isLoading ? 'Adding...' : `Add ${uniqueKeys.length} Keys`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
