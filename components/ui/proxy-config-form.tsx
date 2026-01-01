'use client';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ProxyConfig {
  enabled: boolean;
  type: 'http' | 'socks5';
  host: string;
  port: string;
  username: string;
  password: string;
}

interface ProxyConfigFormProps {
  value: ProxyConfig;
  onChange: (value: ProxyConfig) => void;
  compact?: boolean;
}

export function ProxyConfigForm({ value, onChange, compact = false }: ProxyConfigFormProps) {
  const update = (partial: Partial<ProxyConfig>) => {
    onChange({ ...value, ...partial });
  };

  return (
    <div className="rounded-lg border p-3">
      <Field orientation="horizontal">
        <Switch
          checked={value.enabled}
          onCheckedChange={(enabled) => update({ enabled })}
        />
        <FieldLabel>代理设置</FieldLabel>
      </Field>

      {value.enabled && (
        <div className="pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <FieldGroup>
            <div className={`grid gap-3 ${compact ? 'grid-cols-3' : 'sm:grid-cols-3'}`}>
              <Field>
                <FieldLabel htmlFor="proxy-type" className="text-muted-foreground">类型</FieldLabel>
                <Select
                  value={value.type}
                  onValueChange={(type: 'http' | 'socks5') => update({ type })}
                >
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
                <FieldLabel htmlFor="proxy-host" className="text-muted-foreground">主机</FieldLabel>
                <Input
                  id="proxy-host"
                  placeholder="127.0.0.1"
                  value={value.host}
                  onChange={(e) => update({ host: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="proxy-port" className="text-muted-foreground">端口</FieldLabel>
                <Input
                  id="proxy-port"
                  type="number"
                  placeholder="7890"
                  value={value.port}
                  onChange={(e) => update({ port: e.target.value })}
                />
              </Field>
            </div>

            <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'sm:grid-cols-2'}`}>
              <Field>
                <FieldLabel htmlFor="proxy-username" className="text-muted-foreground">用户名 (可选)</FieldLabel>
                <Input
                  id="proxy-username"
                  placeholder="用户名"
                  value={value.username}
                  onChange={(e) => update({ username: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="proxy-password" className="text-muted-foreground">密码 (可选)</FieldLabel>
                <Input
                  id="proxy-password"
                  type="password"
                  placeholder="密码"
                  value={value.password}
                  onChange={(e) => update({ password: e.target.value })}
                />
              </Field>
            </div>
          </FieldGroup>
        </div>
      )}
    </div>
  );
}

// 从环境变量获取默认代理配置
export function getDefaultProxyConfig(): ProxyConfig {
  const hasProxy = !!(
    process.env.NEXT_PUBLIC_PROXY_TYPE &&
    process.env.NEXT_PUBLIC_PROXY_HOST &&
    process.env.NEXT_PUBLIC_PROXY_PORT
  );

  return {
    enabled: hasProxy,
    type: (process.env.NEXT_PUBLIC_PROXY_TYPE as 'http' | 'socks5') || 'http',
    host: process.env.NEXT_PUBLIC_PROXY_HOST || '',
    port: process.env.NEXT_PUBLIC_PROXY_PORT || '',
    username: process.env.NEXT_PUBLIC_PROXY_USERNAME || '',
    password: process.env.NEXT_PUBLIC_PROXY_PASSWORD || '',
  };
}

// 创建空的代理配置
export function createEmptyProxyConfig(): ProxyConfig {
  return {
    enabled: false,
    type: 'http',
    host: '',
    port: '',
    username: '',
    password: '',
  };
}

// 将 ProxyConfig 转换为 API 格式
export function proxyConfigToApi(config: ProxyConfig) {
  if (!config.enabled || !config.host || !config.port) {
    return null;
  }
  return {
    type: config.type,
    host: config.host,
    port: parseInt(config.port, 10),
    username: config.username || undefined,
    password: config.password || undefined,
  };
}

// 从数据库记录恢复代理配置
export function proxyConfigFromRecord(record: {
  proxyType?: string | null;
  proxyHost?: string | null;
  proxyPort?: number | null;
  proxyUsername?: string | null;
  proxyPassword?: string | null;
}): ProxyConfig {
  const hasProxy = !!(record.proxyType && record.proxyHost && record.proxyPort);
  return {
    enabled: hasProxy,
    type: (record.proxyType as 'http' | 'socks5') || 'http',
    host: record.proxyHost || '',
    port: record.proxyPort?.toString() || '',
    username: record.proxyUsername || '',
    password: record.proxyPassword || '',
  };
}
