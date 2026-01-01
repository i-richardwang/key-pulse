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
      toast.error('端口号必须是 1-65535 之间的数字');
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
        toast.success('Proxy 已更新');
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
        toast.success('Proxy 已创建');
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
          <DialogTitle>{isEditing ? '编辑 Proxy' : '添加 Proxy'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="proxy-name">名称</FieldLabel>
              <Input
                id="proxy-name"
                placeholder="香港代理"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="proxy-type">类型</FieldLabel>
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
                <FieldLabel htmlFor="proxy-host">主机</FieldLabel>
                <Input
                  id="proxy-host"
                  placeholder="127.0.0.1"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="proxy-port">端口</FieldLabel>
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
                <FieldLabel htmlFor="proxy-username">用户名 (可选)</FieldLabel>
                <Input
                  id="proxy-username"
                  placeholder="用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="proxy-password">密码 (可选)</FieldLabel>
                <Input
                  id="proxy-password"
                  type="password"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="proxy-description">描述 (可选)</FieldLabel>
              <Input
                id="proxy-description"
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
              <FieldLabel>设为默认 Proxy</FieldLabel>
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading || !name || !host || !port}>
              {isLoading ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
