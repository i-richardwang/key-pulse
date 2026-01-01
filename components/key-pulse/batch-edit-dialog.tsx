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
import { useProxies } from '@/hooks/use-proxies';
import { z } from 'zod';
import { toast } from 'sonner';

interface BatchEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onSave: (updates: {
    providerId?: string;
    proxyId?: string | null;
  }) => Promise<void>;
}

export function BatchEditDialog({ open, onOpenChange, selectedCount, onSave }: BatchEditDialogProps) {
  const { data: providers, isLoading: providersLoading } = useProviders();
  const { data: proxies, isLoading: proxiesLoading } = useProxies();

  const [updateProvider, setUpdateProvider] = useState(false);
  const [updateProxy, setUpdateProxy] = useState(false);

  const [providerId, setProviderId] = useState('');
  const [proxyId, setProxyId] = useState<string>('none');
  const [isLoading, setIsLoading] = useState(false);

  const selectedProvider = providers.find(p => p.id === providerId);
  const selectedProxy = proxyId !== 'none' ? proxies.find(p => p.id === proxyId) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updates: {
      providerId?: string;
      proxyId?: string | null;
    } = {};

    if (updateProvider && providerId) {
      updates.providerId = providerId;
    }

    if (updateProxy) {
      updates.proxyId = proxyId === 'none' ? null : proxyId;
    }

    if (Object.keys(updates).length === 0) {
      onOpenChange(false);
      return;
    }

    // Validate with Zod
    const updateSchema = z.object({
      providerId: z.uuid().optional(),
      proxyId: z.uuid().nullable().optional(),
    });

    const result = updateSchema.safeParse(updates);
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
      // Reset state
      setUpdateProvider(false);
      setUpdateProxy(false);
      setProviderId('');
      setProxyId('none');
    }
    onOpenChange(open);
  };

  const isFormLoading = providersLoading || proxiesLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batch Edit</DialogTitle>
          <DialogDescription>
            Modify {selectedCount} selected keys. Only checked fields will be updated.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {/* Provider */}
            <Field orientation="horizontal">
              <Switch checked={updateProvider} onCheckedChange={setUpdateProvider} />
              <FieldLabel>Change Provider</FieldLabel>
            </Field>
            {updateProvider && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <Select
                  value={providerId}
                  onValueChange={setProviderId}
                  disabled={isFormLoading || providers.length === 0}
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
              </div>
            )}

            {/* Proxy */}
            <div className="border-t pt-4">
              <Field orientation="horizontal">
                <Switch checked={updateProxy} onCheckedChange={setUpdateProxy} />
                <FieldLabel>Change Proxy</FieldLabel>
              </Field>

              {updateProxy && (
                <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Select
                    value={proxyId}
                    onValueChange={setProxyId}
                    disabled={isFormLoading}
                  >
                    <SelectTrigger id="batch-edit-proxy">
                      <SelectValue placeholder="Select Proxy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Proxy</SelectItem>
                      {proxies.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.host}:{p.port})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedProxy && (
                    <div className="rounded-md bg-muted px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Type: </span>
                      <span className="font-mono">{selectedProxy.type.toUpperCase()}</span>
                      <span className="text-muted-foreground ml-3">Address: </span>
                      <span className="font-mono">{selectedProxy.host}:{selectedProxy.port}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || (!updateProvider && !updateProxy) || (updateProvider && !providerId)}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
