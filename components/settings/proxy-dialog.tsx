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
import { useCreateProxy, useUpdateProxy } from '@/hooks/use-proxies';
import { toast } from 'sonner';
import type { Proxy, ProxyType } from '@/db/schema';

interface ProxyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProxy?: Proxy | null;
  onSuccess: () => void;
}

export function ProxyDialog({
  open,
  onOpenChange,
  editProxy,
  onSuccess,
}: ProxyDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ProxyType>('http');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const { createProxy, isLoading: isCreating } = useCreateProxy();
  const { updateProxy, isLoading: isUpdating } = useUpdateProxy();

  const isEditing = !!editProxy;
  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (open) {
      if (editProxy) {
        setName(editProxy.name);
        setType(editProxy.type as ProxyType);
        setHost(editProxy.host);
        setPort(String(editProxy.port));
        setUsername(editProxy.username || '');
        setPassword(editProxy.password || '');
        setDescription(editProxy.description || '');
        setIsDefault(editProxy.isDefault || false);
      } else {
        setName('');
        setType('http');
        setHost('');
        setPort('');
        setUsername('');
        setPassword('');
        setDescription('');
        setIsDefault(false);
      }
    }
  }, [open, editProxy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
      toast.error('Port must be a number between 1-65535');
      return;
    }

    try {
      if (isEditing) {
        await updateProxy({
          id: editProxy.id,
          name,
          type,
          host,
          port: portNum,
          username: username || undefined,
          password: password || undefined,
          description: description || undefined,
          isDefault,
        });
        toast.success('Proxy updated');
      } else {
        await createProxy({
          name,
          type,
          host,
          port: portNum,
          username: username || undefined,
          password: password || undefined,
          description: description || undefined,
          isDefault,
        });
        toast.success('Proxy created');
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
          <DialogTitle>{isEditing ? 'Edit Proxy' : 'Add Proxy'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="proxy-name">Name</FieldLabel>
              <Input
                id="proxy-name"
                placeholder="HK Proxy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="proxy-type">Type</FieldLabel>
                <Select value={type} onValueChange={(v) => setType(v as ProxyType)}>
                  <SelectTrigger id="proxy-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="socks5">SOCKS5</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="proxy-host">Host</FieldLabel>
                <Input
                  id="proxy-host"
                  placeholder="127.0.0.1"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="proxy-port">Port</FieldLabel>
                <Input
                  id="proxy-port"
                  type="number"
                  placeholder="7890"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="proxy-username">Username (optional)</FieldLabel>
                <Input
                  id="proxy-username"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="proxy-password">Password (optional)</FieldLabel>
                <Input
                  id="proxy-password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="proxy-description">Description (optional)</FieldLabel>
              <Input
                id="proxy-description"
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
              <FieldLabel>Set as default Proxy</FieldLabel>
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name || !host || !port}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
