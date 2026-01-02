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
import { keyUpdateSchema } from '@/lib/schemas';
import { toast } from 'sonner';

interface BatchEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onSave: (updates: {
    providerId?: string;
  }) => Promise<void>;
}

export function BatchEditDialog({ open, onOpenChange, selectedCount, onSave }: BatchEditDialogProps) {
  const { data: providers, isLoading: providersLoading } = useProviders();

  const [providerId, setProviderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedProvider = providers.find(p => p.id === providerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!providerId) {
      onOpenChange(false);
      return;
    }

    const updates = { providerId };

    // Validate with schema (reuse updates part)
    const result = keyUpdateSchema.shape.updates.safeParse(updates);
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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setProviderId('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batch Edit</DialogTitle>
          <DialogDescription>
            Change provider for {selectedCount} selected keys.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="batch-edit-provider">Provider</FieldLabel>
              <Select
                value={providerId}
                onValueChange={setProviderId}
                disabled={providersLoading || providers.length === 0}
              >
                <SelectTrigger id="batch-edit-provider">
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
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !providerId || providers.length === 0}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
